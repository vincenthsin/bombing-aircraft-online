const io = require('socket.io-client');

// Ship Shape (same as simulator/frontend)
// 10-cell Heavy Bomber
const SHIP_SHAPE = [
    { x: 0, y: -1 }, // Head
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, // Wings (5 wide)
    { x: 0, y: 1 }, // Body
    { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 } // Tail
];

class RobotPlayer {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.socket = null;

        // State
        this.myShips = [];
        this.enemyBoard = Array(100).fill(0); // 0: unknown, 1: shot
        this.isMyTurn = false;
        this.gameId = null;
    }

    start() {
        console.log(`[Robot] Initializing connection to ${this.serverUrl}`);
        this.socket = io(this.serverUrl);

        console.log(`[Robot] Socket created, waiting for connect event...`);

        this.socket.on('connect', () => {
            console.log(`[Robot ${this.socket.id}] Connected to server`);
            // Join immediately
            console.log(`[Robot ${this.socket.id}] Emitting join_game...`);
            this.socket.emit('join_game', { anonymous: true });
        });

        this.socket.on('connect_error', (err) => {
            console.error(`[Robot] Connection error:`, err.message);
        });

        this.socket.on('game_start', (data) => {
            console.log(`[Robot ${this.socket.id}] Game Started! ID: ${data.gameId}`);
            this.gameId = data.gameId;
            this.placeShips();
        });

        this.socket.on('round_start', ({ yourTurn }) => {
            console.log(`[Robot ${this.socket.id}] Round Started. My Turn: ${yourTurn}`);
            this.isMyTurn = yourTurn;
            if (this.isMyTurn) this.scheduleMove();
        });

        this.socket.on('turn_change', (yourTurn) => {
            console.log(`[Robot ${this.socket.id}] Turn Change. My Turn: ${yourTurn}`);
            this.isMyTurn = yourTurn; // Update explicit turn state
            if (this.isMyTurn) {
                // Simulate thinking time
                this.scheduleMove();
            }
        });

        this.socket.on('shot_result', ({ x, y, result, isMyShot }) => {
            if (isMyShot) {
                console.log(`[Robot ${this.socket.id}] I shot at (${x}, ${y}): ${result}`);
            } else {
                console.log(`[Robot ${this.socket.id}] Enemy shot at me (${x}, ${y}): ${result}`);
            }
        });

        this.socket.on('game_over', ({ result }) => {
            console.log(`[Robot ${this.socket.id}] Game Over: ${result}`);
            this.stop();
        });

        this.socket.on('disconnect', () => {
            console.log(`[Robot] Disconnected`);
            // Don't call stop() here to avoid recursion if stop() calls disconnect()
        });

        this.socket.on('error', (err) => {
            console.error(`[Robot ${this.socket.id}] Error:`, err);
            this.stop();
        });
    }

    stop() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    scheduleMove() {
        const delay = 1000 + Math.random() * 2000;
        setTimeout(() => {
            if (this.socket && this.gameId && this.isMyTurn) {
                this.makeMove();
            }
        }, delay);
    }

    // --- Logic ---

    getShipCoords(cx, cy, rot) {
        return SHIP_SHAPE.map(p => {
            let x = p.x, y = p.y;
            // Rotate
            if (rot === 90) { const temp = x; x = -y; y = temp; }
            else if (rot === 180) { x = -x; y = -y; }
            else if (rot === 270) { const temp = x; x = y; y = -temp; }
            return { x: cx + x, y: cy + y };
        });
    }

    isValidPlacement(shipCoords, placedShips) {
        // Bounds check
        if (shipCoords.some(p => p.x < 0 || p.x >= 10 || p.y < 0 || p.y >= 10)) return false;
        // Overlap check
        for (const ship of placedShips) {
            for (const p of ship.coords) {
                if (shipCoords.some(c => c.x === p.x && c.y === p.y)) return false;
            }
        }
        return true;
    }

    placeShips() {
        console.log(`[Robot ${this.socket.id}] Placing ships...`);
        const ships = [];
        let attempts = 0;

        while (ships.length < 3 && attempts < 1000) {
            attempts++;
            const x = Math.floor(Math.random() * 10);
            const y = Math.floor(Math.random() * 10);
            const rot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];

            const coords = this.getShipCoords(x, y, rot);

            if (this.isValidPlacement(coords, ships)) {
                ships.push({ coords, core: { x, y }, rotation: rot });
            }
        }

        if (ships.length === 3) {
            this.socket.emit('place_ships', { gameId: this.gameId, ships });
        } else {
            console.error(`[Robot ${this.socket.id}] Failed to place ships`);
            this.stop();
        }
    }

    makeMove() {
        if (!this.socket || !this.gameId) return;

        let x, y, idx;
        let attempts = 0;

        // Find a spot we haven't shot yet
        do {
            x = Math.floor(Math.random() * 10);
            y = Math.floor(Math.random() * 10);
            idx = y * 10 + x;
            attempts++;
        } while (this.enemyBoard[idx] !== 0 && attempts < 200);

        // If filled up (rare), just pick random
        if (attempts >= 200) {
            x = Math.floor(Math.random() * 10);
            y = Math.floor(Math.random() * 10);
            idx = y * 10 + x;
        }

        this.enemyBoard[idx] = 1; // Mark as shot
        console.log(`[Robot ${this.socket.id}] Shooting at (${x}, ${y})...`);
        this.socket.emit('shoot', { gameId: this.gameId, x, y });
    }
}

module.exports = RobotPlayer;
