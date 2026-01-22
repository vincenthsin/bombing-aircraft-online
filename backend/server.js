const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const crypto = require('crypto');
const cors = require('cors');

// Import services and repositories
const userService = require('./src/domain/services/userService');
const gameRepository = require('./src/infrastructure/persistence/gameRepository');

const app = express();
const server = http.createServer(app);

// CORS configuration for separate deployments
// - Set CORS_ORIGIN to a comma-separated list of allowed origins (e.g. "https://game.example.com,https://admin.example.com")
// - Use "*" ONLY for local/dev.
const corsOriginsRaw = process.env.CORS_ORIGIN || '*';
const corsOrigin =
    corsOriginsRaw === '*'
        ? '*'
        : corsOriginsRaw.split(',').map(s => s.trim()).filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
    },
    allowRequest: (req, callback) => {
        // Allow requests with Vercel protection bypass
        callback(null, true);
    }
});

// Middleware
app.set('trust proxy', 1);
app.use(cors({
    origin: corsOrigin,
    credentials: true
}));
app.use(express.json());

// Admin Configuration
const ADMIN_PASSWORD = 'admin123'; // Change this in production!
const adminSessions = new Set(); // Store active admin session tokens

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        const decoded = userService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
}

// Backend is API-only. Frontend/admin UI are deployed separately.
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

// Game State
const players = {}; // socket.id -> { id, board: [], ships: [], ready: false, connectedAt: timestamp, userId: number, username: string, authToken: string }
const games = {};   // gameId -> { gameId, player1Id, player2Id, turn: player1Id, status: 'waiting'|'playing'|'finished', startedAt: timestamp, sessionId: number }
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
            ip: player.ip,
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

// User Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!userService.validateUsername(username) ||
            !userService.validateEmail(email) ||
            !userService.validatePassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data'
            });
        }

        const user = await userService.register(username, email, password);
        res.json({
            success: true,
            message: 'User registered successfully',
            user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await userService.login(username, password);

        res.json({
            success: true,
            message: 'Login successful',
            ...result
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const user = await userService.getUserProfile(req.user.userId);
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

// User Profile and History Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await userService.getUserProfile(req.user.userId);
        res.json({
            success: true,
            user
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/user/history', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const history = await userService.getUserGameHistory(req.user.userId, limit, offset);
        res.json({
            success: true,
            history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/user/recent-games', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recentGames = await userService.getUserRecentGames(req.user.userId, limit);
        res.json({
            success: true,
            games: recentGames
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/api/games/:gameId/details', authenticateToken, async (req, res) => {
    try {
        const { gameId } = req.params;
        const gameDetails = await gameRepository.getGameDetails(gameId);

        if (!gameDetails) {
            return res.status(404).json({
                success: false,
                message: 'Game not found'
            });
        }

        // Check if user is a participant in this game
        if (gameDetails.player1_id !== req.user.userId && gameDetails.player2_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({
            success: true,
            game: gameDetails
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Admin Socket.IO Namespace
const adminNamespace = io.of('/admin', {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
    }
});
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

// Helpers to manage player state
function createEmptyBoard() {
    return Array(10).fill(null).map(() => Array(10).fill(0));
}

function resetPlayerState(player) {
    if (!player) return;
    player.board = createEmptyBoard();
    player.ships = [];
    player.ready = false;
}

// Normalize client IP to IPv4 when possible
function extractIPv4(rawIp) {
    if (!rawIp) return null;
    const ip = rawIp.toString().trim();
    // Handle IPv6-mapped IPv4 addresses like "::ffff:127.0.0.1"
    if (ip.startsWith('::ffff:')) return ip.substring(7);
    // If raw looks like IPv6 with embedded IPv4, take last segment
    const parts = ip.split(':');
    if (parts.length > 1 && parts[parts.length - 1].includes('.')) {
        return parts[parts.length - 1];
    }
    // Basic IPv4 regex check
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
    return ipv4Regex.test(ip) ? ip : null;
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Derive client IP (favor proxy header when available) and normalize to IPv4
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    const rawIp = forwardedFor ? forwardedFor.split(',')[0].trim() : socket.handshake.address;
    const ipAddress = extractIPv4(rawIp) || 'unknown';

    // Update statistics
    serverStats.totalConnections++;
    const currentUsers = Object.keys(players).length + 1;
    if (currentUsers > serverStats.peakConcurrentUsers) {
        serverStats.peakConcurrentUsers = currentUsers;
    }

    // Initialize player state (will be updated when authenticated)
    players[socket.id] = {
        id: socket.id,
        ip: ipAddress,
        board: Array(10).fill(null).map(() => Array(10).fill(0)), // 0: empty, 1: ship part, 2: hit, 3: miss
        ships: [], // List of ship coordinates
        ready: false,
        connectedAt: Date.now(),
        userId: null,
        username: null,
        authToken: null,
        authenticated: false
    };

    // Authentication handler
    socket.on('authenticate', async (token) => {
        try {
            const user = await userService.getUserFromToken(token);
            players[socket.id].userId = user.id;
            players[socket.id].username = user.username;
            players[socket.id].authToken = token;
            players[socket.id].authenticated = true;

            socket.emit('authenticated', {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });

            console.log(`User ${user.username} authenticated on socket ${socket.id}`);
        } catch (error) {
            socket.emit('authentication_error', {
                success: false,
                message: error.message
            });
        }
    });

    // Notify admin
    notifyAdmin('user_connected', {
        userId: socket.id,
        ip: ipAddress,
        connectedAt: players[socket.id].connectedAt,
        totalUsers: Object.keys(players).length
    });

    socket.on('join_game', async (data) => {
        // Handle case where data might be undefined or not an object
        const anonymous = data && typeof data === 'object' && data.anonymous === true;
        const player = players[socket.id];

        // If no player object exists, reject
        if (!player) {
            socket.emit('error', 'Connection error. Please refresh the page.');
            return;
        }

        // Allow play for all users - anonymous for unauthenticated, authenticated for logged-in users
        // Continue with game logic for all users

        console.log('Allowing join_game - proceeding with game logic');

        if (queue.length > 0) {
            // Pop opponents until we find a live socket entry
            let opponentId = null;
            while (queue.length > 0 && !opponentId) {
                const candidateId = queue.shift();
                if (players[candidateId]) {
                    opponentId = candidateId;
                }
            }

            if (!opponentId || !players[opponentId]) {
                // No valid opponent found, re-queue current player
                if (!queue.includes(socket.id)) queue.push(socket.id);
                socket.emit('waiting', 'Waiting for an opponent...');
                return;
            }

            // Freshen player states for the new match
            resetPlayerState(player);
            resetPlayerState(players[opponentId]);

            const gameId = `${socket.id}-${opponentId}`;

            // Create game session in database only if both players are authenticated
            let sessionId = null;
            if (player.authenticated && players[opponentId].authenticated) {
                sessionId = await gameRepository.createGameSession(
                    gameId,
                    players[opponentId].userId,
                    player.userId
                );
            }

            games[gameId] = {
                gameId,
                player1Id: opponentId,
                player2Id: socket.id,
                turn: opponentId, // Player 1 starts
                status: 'placing',
                startedAt: Date.now(),
                sessionId: sessionId,
                moveCount: 0,
                isTracked: sessionId !== null // Whether this game should be tracked
            };

            // Prepare opponent info (use username if authenticated, otherwise generic)
            const opponentInfo = players[opponentId].authenticated ? {
                id: players[opponentId].userId,
                username: players[opponentId].username
            } : {
                username: 'Guest Player'
            };

            const playerInfo = player.authenticated ? {
                id: player.userId,
                username: player.username
            } : {
                username: 'Guest Player'
            };

            io.to(opponentId).emit('game_start', {
                gameId,
                opponent: playerInfo,
                role: 'player1'
            });
            io.to(socket.id).emit('game_start', {
                gameId,
                opponent: opponentInfo,
                role: 'player2'
            });

            const opponentName = players[opponentId].authenticated ? players[opponentId].username : 'Guest';
            const playerName = player.authenticated ? player.username : 'Guest';
            console.log(`Game started: ${gameId} between ${opponentName} and ${playerName} (${games[gameId].isTracked ? 'tracked' : 'anonymous'})`);

            // Notify admin
            notifyAdmin('game_created', {
                gameId,
                player1Username: opponentName,
                player2Username: playerName,
                status: 'placing',
                isTracked: games[gameId].isTracked
            });
        } else {
            queue.push(socket.id);
            socket.emit('waiting', 'Waiting for an opponent...');

            // Notify admin
            const playerName = player.authenticated ? player.username : 'Guest';
            notifyAdmin('queue_updated', {
                queueLength: queue.length,
                userId: socket.id,
                username: playerName,
                action: 'joined'
            });
        }
    });

    socket.on('place_ships', async ({ gameId, ships }) => {
        const game = games[gameId];
        if (!game) return;

        const currentPlayer = players[socket.id];
        if (!currentPlayer) {
            // Player disconnected or state missing
            return;
        }

        // Validate and store ships
        currentPlayer.ships = ships;
        currentPlayer.ready = true;

        // Update board state with ships (internally)
        // In a real game, we'd validate these positions rigorously
        ships.forEach(ship => {
            ship.coords.forEach(({ x, y }) => {
                if (x >= 0 && x < 10 && y >= 0 && y < 10) {
                    currentPlayer.board[y][x] = 1; // 1 = Ship present
                }
            });
        });

        // Record ship placement in database only if game is tracked
        if (game.isTracked) {
            try {
                game.moveCount++;
                await gameRepository.recordMove(
                    game.sessionId,
                    players[socket.id].userId,
                    'place_ships',
                    null, null, null,
                    game.moveCount
                );
            } catch (error) {
                console.error('Error recording ship placement:', error);
            }
        }

        const p1 = players[game.player1Id];
        const p2 = players[game.player2Id];

        // If opponent disconnected / missing, clean up and requeue current player
        if (!p1 || !p2) {
            delete games[gameId];

            resetPlayerState(currentPlayer);
            if (!queue.includes(socket.id)) {
                queue.push(socket.id);
            }

            socket.emit('waiting', 'Opponent left; re-queued for another match.');

            notifyAdmin('queue_updated', {
                queueLength: queue.length,
                userId: socket.id,
                username: currentPlayer.username || 'Guest',
                action: 'requeued'
            });
            return;
        }

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

    socket.on('shoot', async ({ gameId, x, y }) => {
        const game = games[gameId];
        if (!game || game.status !== 'playing') return;

        if (game.turn !== socket.id) {
            socket.emit('error', 'Not your turn!');
            return;
        }

        const opponentId = (socket.id === game.player1Id) ? game.player2Id : game.player1Id;
        const opponent = players[opponentId];
        if (!opponent) {
            // Opponent disconnected; end this game and requeue the active player.
            delete games[gameId];

            const currentPlayer = players[socket.id];
            resetPlayerState(currentPlayer);
            if (!queue.includes(socket.id)) {
                queue.push(socket.id);
            }

            socket.emit('waiting', 'Opponent disconnected; searching for a new match...');

            notifyAdmin('queue_updated', {
                queueLength: queue.length,
                userId: socket.id,
                username: currentPlayer?.username || 'Guest',
                action: 'requeued'
            });
            return;
        }

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

        // Record shot in database only if game is tracked
        if (game.isTracked) {
            try {
                game.moveCount++;
                await gameRepository.recordMove(
                    game.sessionId,
                    players[socket.id].userId,
                    'shoot',
                    x, y, result,
                    game.moveCount
                );
            } catch (error) {
                console.error('Error recording shot:', error);
            }
        }

        // Notify result
        io.to(socket.id).emit('shot_result', { x, y, result, isMyShot: true });
        io.to(opponentId).emit('shot_result', { x, y, result, isMyShot: false });

        // Check Win Condition: Are ALL ships destroyed?
        const allDestroyed = opponent.ships.every(s => s.destroyed);

        if (allDestroyed) {
            game.status = 'finished';

            // Only update stats if game was tracked
            if (game.isTracked) {
                serverStats.totalGamesPlayed++;

                const winnerId = players[socket.id].userId;
                const loserId = players[opponentId].userId;
                const duration = Math.floor((Date.now() - game.startedAt) / 1000); // Duration in seconds

                // Update game status in database
                await gameRepository.updateGameStatus(gameId, 'finished', winnerId, duration);

                // Update user statistics
                const winnerShots = game.moveCount; // Approximate shots count
                await gameRepository.updateUserStats(winnerId, 'win', winnerShots, 0, 0, 0, duration);
                await gameRepository.updateUserStats(loserId, 'lose', winnerShots, 0, 0, 0, duration);
            }

            io.to(socket.id).emit('game_over', { result: 'win', opponentShips: opponent.ships });
            io.to(opponentId).emit('game_over', { result: 'lose', opponentShips: players[socket.id].ships });

            // Notify admin
            const winnerName = players[socket.id].authenticated ? players[socket.id].username : 'Guest';
            const loserName = players[opponentId].authenticated ? players[opponentId].username : 'Guest';
            notifyAdmin('game_finished', {
                gameId,
                winnerUsername: winnerName,
                loserUsername: loserName,
                duration: game.isTracked ? Math.floor((Date.now() - game.startedAt) / 1000) : 0,
                totalGamesPlayed: serverStats.totalGamesPlayed,
                isTracked: game.isTracked
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
        const player = players[socket.id];
        delete players[socket.id];
        // Handle game cleanup...
        queue = queue.filter(id => id !== socket.id);

        // Notify admin
        notifyAdmin('user_disconnected', {
            userId: socket.id,
            ip: player?.ip,
            totalUsers: Object.keys(players).length
        });
    });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;
server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
