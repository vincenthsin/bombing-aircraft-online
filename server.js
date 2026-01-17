const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Admin Configuration
const ADMIN_PASSWORD = 'admin123'; // Change this in production!

// Admin Page Route
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Game State
const players = {}; // socket.id -> { id, board: [], ships: [], ready: false, connectedAt: timestamp, username: string }
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
        res.json({ success: true, message: 'Authenticated' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.get('/api/admin/stats', (req, res) => {
    const activeUsers = Object.keys(players).length;
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

app.get('/api/admin/users', (req, res) => {
    const userList = Object.values(players).map(player => {
        // Find if player is in a game
        let gameId = null;
        let gameStatus = null;
        for (const [gId, game] of Object.entries(games)) {
            if (game.player1Id === player.id || game.player2Id === player.id) {
                gameId = gId;
                gameStatus = game.status;
                break;
            }
        }

        return {
            id: player.id,
            connectedAt: player.connectedAt,
            ready: player.ready,
            inQueue: queue.includes(player.id),
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
adminNamespace.on('connection', (socket) => {
    console.log('Admin connected:', socket.id);

    // Send initial data
    socket.emit('initial_data', {
        players: Object.values(players),
        games: Object.entries(games).map(([id, game]) => ({ ...game, gameId: id })),
        queue,
        stats: serverStats
    });
});

// Helper function to broadcast to admin
function notifyAdmin(event, data) {
    adminNamespace.emit(event, data);
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Update statistics
    serverStats.totalConnections++;
    const currentUsers = Object.keys(players).length + 1;
    if (currentUsers > serverStats.peakConcurrentUsers) {
        serverStats.peakConcurrentUsers = currentUsers;
    }

    // Initialize player state
    players[socket.id] = {
        id: socket.id,
        board: Array(10).fill(null).map(() => Array(10).fill(0)), // 0: empty, 1: ship part, 2: hit, 3: miss
        ships: [], // List of ship coordinates
        ready: false,
        connectedAt: Date.now()
    };

    // Notify admin
    notifyAdmin('user_connected', {
        userId: socket.id,
        connectedAt: players[socket.id].connectedAt,
        totalUsers: Object.keys(players).length
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

    socket.on('place_ships', ({ gameId, ships }) => {
        const game = games[gameId];
        if (!game) return;

        // Validate and store ships
        players[socket.id].ships = ships;
        players[socket.id].ready = true;

        // Update board state with ships (internally)
        // In a real game, we'd validate these positions rigorously
        ships.forEach(ship => {
            ship.coords.forEach(({ x, y }) => {
                if (x >= 0 && x < 10 && y >= 0 && y < 10) {
                    players[socket.id].board[y][x] = 1; // 1 = Ship present
                }
            });
        });

        const p1 = players[game.player1Id];
        const p2 = players[game.player2Id];

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
    });

    socket.on('shoot', ({ gameId, x, y }) => {
        const game = games[gameId];
        if (!game || game.status !== 'playing') return;

        if (game.turn !== socket.id) {
            socket.emit('error', 'Not your turn!');
            return;
        }

        const opponentId = (socket.id === game.player1Id) ? game.player2Id : game.player1Id;
        const opponent = players[opponentId];

        // Check hit or miss
        let result = 'miss';
        const targetValue = opponent.board[y][x];

        // 0 = empty, 1 = ship, 2 = hit, 3 = miss, 4 = fatal
        if (targetValue !== 0 && targetValue !== 1) {
            // Already shot here
            return;
        }

        // Find which ship was hit (if any)
        let hitShip = null;
        let isHead = false;

        for (const ship of opponent.ships) {
            // ship.coords[0] is HEAD
            if (ship.coords[0].x === x && ship.coords[0].y === y) {
                hitShip = ship;
                isHead = true;
                break;
            }
            // Check body
            for (let i = 1; i < ship.coords.length; i++) {
                if (ship.coords[i].x === x && ship.coords[i].y === y) {
                    hitShip = ship;
                    break;
                }
            }
            if (hitShip) break;
        }

        if (hitShip) {
            if (isHead) {
                result = 'fatal';
                opponent.board[y][x] = 4; // Fatal
                hitShip.destroyed = true; // Mark ship destroyed instantly
            } else {
                result = 'hit';
                opponent.board[y][x] = 2; // Hit

                // Check if this normal hit destroyed the ship (all parts hit)
                let allHit = true;
                for (const p of hitShip.coords) {
                    const cellVal = opponent.board[p.y][p.x];
                    // If any part is NOT hit (val=1) and NOT fatal (val=4) and NOT hit (val=2) -> then it's alive
                    // Actually we just check if it is 0 or 1. 
                    // 1 is intact ship part.
                    if (opponent.board[p.y][p.x] === 1) {
                        allHit = false;
                        break;
                    }
                }
                if (allHit) hitShip.destroyed = true;
            }
        } else {
            result = 'miss';
            opponent.board[y][x] = 3; // Miss
        }

        // Notify result
        io.to(socket.id).emit('shot_result', { x, y, result, isMyShot: true });
        io.to(opponentId).emit('shot_result', { x, y, result, isMyShot: false });

        // Check Win Condition: Are ALL ships destroyed?
        const allDestroyed = opponent.ships.every(s => s.destroyed);

        if (allDestroyed) {
            game.status = 'finished';
            serverStats.totalGamesPlayed++;

            io.to(socket.id).emit('game_over', { result: 'win', opponentShips: opponent.ships });
            io.to(opponentId).emit('game_over', { result: 'lose', opponentShips: players[socket.id].ships });

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
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        // Handle game cleanup...
        queue = queue.filter(id => id !== socket.id);

        // Notify admin
        notifyAdmin('user_disconnected', {
            userId: socket.id,
            totalUsers: Object.keys(players).length
        });
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
