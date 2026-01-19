const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const crypto = require('crypto');

// Import DDD architecture
const { infrastructure } = require('./src');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Admin Configuration
const ADMIN_PASSWORD = 'admin123'; // Change this in production!
const adminSessions = new Set(); // Store active admin session tokens

// Admin Page Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Game State
const playerRepository = new infrastructure.Repositories.InMemoryPlayerRepository();
const playerApplicationService = new infrastructure.Services.PlayerApplicationService(playerRepository);
const games = {};   // gameId -> { player1Id, player2Id, turn: player1Id, status: 'waiting'|'playing'|'finished', startedAt: timestamp }
let queue = [];     // [socket.id]

// Server Statistics
const serverStats = {
    startTime: Date.now(),
    totalConnections: 0,
    peakConcurrentUsers: 0,
    totalGamesPlayed: 0
};

// Admin API Routes
app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = crypto.randomBytes(32).toString('hex');
        adminSessions.add(token);
        res.json({ success: true, message: 'Authenticated', token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.post('/api/admin/verify', (req, res) => {
    const { token } = req.body;
    if (token && adminSessions.has(token)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

app.post('/api/admin/logout', (req, res) => {
    const { token } = req.body;
    if (token) {
        adminSessions.delete(token);
    }
    res.json({ success: true });
});

app.get('/api/admin/stats', async (req, res) => {
    const allPlayers = await playerApplicationService.getAllPlayers();
    const activeUsers = allPlayers.length;
    const activeGames = Object.values(games).filter(g => g.status !== 'finished').length;
    const uptime = Date.now() - serverStats.startTime;

    res.json({
        activeUsers,
        activeGames,
        queueLength: queue.length,
        totalGamesPlayed: serverStats.totalGamesPlayed,
        totalConnections: serverStats.totalConnections,
        peakConcurrentUsers: serverStats.peakConcurrentUsers,
        uptime,
        serverStartTime: serverStats.startTime
    });
});

app.get('/api/admin/users', async (req, res) => {
    const allPlayers = await playerApplicationService.getAllPlayers();
    const userList = allPlayers.map(player => {
        // Find if player is in a game
        let gameId = null;
        let gameStatus = null;
        for (const [gId, game] of Object.entries(games)) {
            if (game.player1Id === player.playerId || game.player2Id === player.playerId) {
                gameId = gId;
                gameStatus = game.status;
                break;
            }
        }

        return {
            id: player.playerId,
            connectedAt: player.connectedAt,
            ready: player.ready,
            inQueue: queue.includes(player.playerId),
            gameId,
            gameStatus
        };
    });

    res.json(userList);
});

app.get('/api/admin/games', (req, res) => {
    const gameList = Object.entries(games).map(([gameId, game]) => ({
        gameId,
        player1Id: game.player1Id,
        player2Id: game.player2Id,
        status: game.status,
        turn: game.turn,
        startedAt: game.startedAt,
        duration: game.startedAt ? Date.now() - game.startedAt : 0
    }));

    res.json(gameList);
});

// Admin Socket.IO Namespace
const adminNamespace = io.of('/admin');
adminNamespace.on('connection', async (socket) => {
    console.log('Admin connected:', socket.id);

    // Send initial data
    const allPlayers = await playerApplicationService.getAllPlayers();
    socket.emit('initial_data', {
        players: allPlayers,
        games: Object.entries(games).map(([id, game]) => ({ ...game, gameId: id })),
        queue,
        stats: serverStats
    });
});

// Helper function to broadcast to admin
function notifyAdmin(event, data) {
    adminNamespace.emit(event, data);
}

io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);

    // Update statistics
    serverStats.totalConnections++;
    const allPlayers = await playerApplicationService.getAllPlayers();
    const currentUsers = allPlayers.length + 1;
    if (currentUsers > serverStats.peakConcurrentUsers) {
        serverStats.peakConcurrentUsers = currentUsers;
    }

    // Create player using DDD
    await playerApplicationService.createPlayer(socket.id);

    // Get the created player
    const player = await playerApplicationService.getPlayer(socket.id);

    // Notify admin
    notifyAdmin('user_connected', {
        userId: socket.id,
        connectedAt: player.connectedAt,
        totalUsers: currentUsers
    });

    socket.on('join_game', () => {
        if (queue.length > 0) {
            const opponentId = queue.shift();
            const gameId = `${socket.id}-${opponentId}`;

            games[gameId] = {
                player1Id: opponentId,
                player2Id: socket.id,
                turn: opponentId, // Player 1 starts
                status: 'placing',
                startedAt: Date.now()
            };

            // Notify both players
            io.to(opponentId).emit('game_start', { gameId, opponent: socket.id, role: 'player1' });
            io.to(socket.id).emit('game_start', { gameId, opponent: opponentId, role: 'player2' });

            console.log(`Game started: ${gameId}`);

            // Notify admin
            notifyAdmin('game_created', {
                gameId,
                player1Id: opponentId,
                player2Id: socket.id,
                status: 'placing'
            });
        } else {
            queue.push(socket.id);
            socket.emit('waiting', 'Waiting for an opponent...');

            // Notify admin
            notifyAdmin('queue_updated', {
                queueLength: queue.length,
                userId: socket.id,
                action: 'joined'
            });
        }
    });

    socket.on('place_ships', async ({ gameId, ships }) => {
        const game = games[gameId];
        if (!game) {
            console.log(`Game ${gameId} not found`);
            return;
        }

        try {
            // Convert ships to new format if needed
            const aircraftConfigs = ships.map((ship, index) => {
                // Check if it's the old format (has coords, core, rotation)
                if (ship.coords && ship.core && typeof ship.rotation === 'number') {
                    // Convert old format to new format
                    const orientation = ship.rotation === 0 || ship.rotation === 180 ? 'horizontal' : 'vertical';
                    return {
                        position: ship.core, // Head position
                        orientation: orientation
                    };
                } else {
                    // Already in new format
                    return ship;
                }
            });

            // Use DDD to place ships
            await playerApplicationService.placeShips(socket.id, aircraftConfigs);

            // Check if both players are ready
            const p1 = await playerApplicationService.getPlayer(game.player1Id);
            const p2 = await playerApplicationService.getPlayer(game.player2Id);

            if (p1.ready && p2.ready) {
                game.status = 'playing';
                io.to(game.player1Id).emit('round_start', { yourTurn: true });
                io.to(game.player2Id).emit('round_start', { yourTurn: false });

                // Notify admin
                notifyAdmin('game_status_changed', {
                    gameId,
                    status: 'playing',
                    player1Ready: p1.ready,
                    player2Ready: p2.ready
                });
            } else {
                socket.emit('waiting_opponent_ships', 'Waiting for opponent to place ships...');
            }
        } catch (error) {
            console.error('Error placing ships:', error);
            socket.emit('error', 'Invalid ship placement');
        }
    });

    socket.on('shoot', async ({ gameId, x, y }) => {
        const game = games[gameId];
        if (!game || game.status !== 'playing') return;

        if (game.turn !== socket.id) {
            socket.emit('error', 'Not your turn!');
            return;
        }

        const opponentId = (socket.id === game.player1Id) ? game.player2Id : game.player1Id;

        try {
            // Use DDD to process the shot
            const shotResult = await playerApplicationService.processShot(opponentId, { x, y });

            // Notify result
            io.to(socket.id).emit('shot_result', { x, y, result: shotResult.result, isMyShot: true });
            io.to(opponentId).emit('shot_result', { x, y, result: shotResult.result, isMyShot: false });

            // Check Win Condition
            if (shotResult.playerLost) {
                game.status = 'finished';
                serverStats.totalGamesPlayed++;

                // Get ship data for both players
                const winnerShips = (await playerApplicationService.getPlayer(socket.id)).aircraft;
                const loserShips = (await playerApplicationService.getPlayer(opponentId)).aircraft;

                io.to(socket.id).emit('game_over', { result: 'win', opponentShips: loserShips });
                io.to(opponentId).emit('game_over', { result: 'lose', opponentShips: winnerShips });

                // Notify admin
                notifyAdmin('game_finished', {
                    gameId,
                    winner: socket.id,
                    loser: opponentId,
                    duration: Date.now() - game.startedAt,
                    totalGamesPlayed: serverStats.totalGamesPlayed
                });
            } else {
                // Switch Turn
                game.turn = opponentId;
                io.to(opponentId).emit('turn_change', true);
                io.to(socket.id).emit('turn_change', false);

                // Notify admin
                notifyAdmin('turn_changed', {
                    gameId,
                    currentTurn: opponentId
                });
            }
        } catch (error) {
            console.error('Error processing shot:', error);
            socket.emit('error', 'Invalid shot');
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);

        // Use DDD to disconnect player
        await playerApplicationService.disconnectPlayer(socket.id);

        // Handle game cleanup...
        queue = queue.filter(id => id !== socket.id);

        // Get updated player count
        const allPlayers = await playerApplicationService.getAllPlayers();

        // Notify admin
        notifyAdmin('user_disconnected', {
            userId: socket.id,
            totalUsers: allPlayers.length
        });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
