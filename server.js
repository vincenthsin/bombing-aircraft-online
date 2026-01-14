const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Game State
const players = {}; // socket.id -> { id, board: [], ships: [], ready: false }
const games = {};   // gameId -> { player1Id, player2Id, turn: player1Id, status: 'waiting'|'playing'|'finished' }
let queue = [];     // [socket.id]

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Initialize player state
    players[socket.id] = {
        id: socket.id,
        board: Array(10).fill(null).map(() => Array(10).fill(0)), // 0: empty, 1: ship part, 2: hit, 3: miss
        ships: [], // List of ship coordinates
        ready: false
    };

    socket.on('join_game', () => {
        if (queue.length > 0) {
            const opponentId = queue.shift();
            const gameId = `${socket.id}-${opponentId}`;
            
            games[gameId] = {
                player1Id: opponentId,
                player2Id: socket.id,
                turn: opponentId, // Player 1 starts
                status: 'placing'
            };

            // Notify both players
            io.to(opponentId).emit('game_start', { gameId, opponent: socket.id, role: 'player1' });
            io.to(socket.id).emit('game_start', { gameId, opponent: opponentId, role: 'player2' });

            console.log(`Game started: ${gameId}`);
        } else {
            queue.push(socket.id);
            socket.emit('waiting', 'Waiting for an opponent...');
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
            ship.coords.forEach(({x, y}) => {
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

        // 0 = empty, 1 = ship, 2 = hit, 3 = miss
        if (targetValue === 0) {
            opponent.board[y][x] = 3; // Miss
            result = 'miss';
        } else if (targetValue === 1) {
            opponent.board[y][x] = 2; // Hit
            result = 'hit';
            // Check for ship destruction (head shot or full body) - Simplified for now: just hit
            // In strict rules, we need to know WHICH part of the plane was hit. 
            // For now, let's just say "Hit".
        } else {
            // Already shot here
            return; 
        }

        // Notify result
        io.to(socket.id).emit('shot_result', { x, y, result, isMyShot: true });
        io.to(opponentId).emit('shot_result', { x, y, result, isMyShot: false });

        // Check Win Condition (All ship parts hit? Or just Heads?)
        // Simplified: Count remaining ship parts
        let remainingParts = 0;
        opponent.board.forEach(row => row.forEach(cell => { if(cell === 1) remainingParts++; }));
        
        if (remainingParts === 0) {
            game.status = 'finished';
            io.to(socket.id).emit('game_over', 'win');
            io.to(opponentId).emit('game_over', 'lose');
        } else {
            // Switch Turn
            game.turn = opponentId;
            io.to(opponentId).emit('turn_change', true);
            io.to(socket.id).emit('turn_change', false);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        // Handle game cleanup...
        queue = queue.filter(id => id !== socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
