const io = require('socket.io-client');
const socket = io('http://localhost:3000');

const GAME_ID_PATTERN = /Match Found!/; // Not used directly, but logical context
let gameId = null;
let myShips = [];
let myBoard = Array(100).fill(0); // 0: empty, 1: ship
let enemyBoard = Array(100).fill(0); // 0: unknown, 1: shot
let isMyTurn = false;

// Ship Shape (10-cell Heavy Bomber)
const SHIP_SHAPE = [
    { x: 0, y: -1 }, // Head
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, // Wings (5 wide)
    { x: 0, y: 1 }, // Body
    { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 } // Tail
];

console.log("Simulator starting...");

socket.on('connect', () => {
    console.log('Connected to server!');
    socket.emit('join_game');
    console.log('Searching for match...');
});

socket.on('waiting', (msg) => {
    console.log('Status:', msg);
});

socket.on('game_start', (data) => {
    console.log('Game Started! ID:', data.gameId);
    gameId = data.gameId;
    placeShips();
});

socket.on('round_start', ({ yourTurn }) => {
    console.log('Round Started. My Turn:', yourTurn);
    isMyTurn = yourTurn;
    if (isMyTurn) makeMove();
});

socket.on('turn_change', (yourTurn) => {
    console.log('Turn Change. My Turn:', yourTurn);
    isMyTurn = yourTurn; // Update explicit turn state
    if (isMyTurn) setTimeout(makeMove, 1000); // Small delay for realism
});

socket.on('shot_result', ({ x, y, result, isMyShot }) => {
    if (isMyShot) {
        console.log(`I shot at (${x}, ${y}): ${result}`);
        // update internal tracking if needed
    } else {
        console.log(`Enemy shot at me (${x}, ${y}): ${result}`);
    }
});

socket.on('game_over', ({ result }) => {
    console.log('GAME OVER:', result.toUpperCase());
    if (result === 'win') console.log("I WON!");
    else console.log("I LOST.");
    process.exit(0);
});

socket.on('disconnect', () => {
    console.log('Disconnected.');
});

// --- Logic ---

function getShipCoords(cx, cy, rot) {
    return SHIP_SHAPE.map(p => {
        let x = p.x, y = p.y;

        // Rotate
        if (rot === 90) { const temp = x; x = -y; y = temp; }
        else if (rot === 180) { x = -x; y = -y; }
        else if (rot === 270) { const temp = x; x = y; y = -temp; }

        return { x: cx + x, y: cy + y };
    });
}

function isValidPlacement(shipCoords, placedShips) {
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

function placeShips() {
    console.log("Placing ships...");
    const ships = [];
    let attempts = 0;

    while (ships.length < 3 && attempts < 1000) {
        attempts++;
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        const rot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];

        const coords = getShipCoords(x, y, rot);

        if (isValidPlacement(coords, ships)) {
            ships.push({ coords, core: { x, y }, rotation: rot });
        }
    }

    if (ships.length === 3) {
        console.log("Ships placed successfully.");
        socket.emit('place_ships', { gameId, ships });
    } else {
        console.error("Failed to place 3 ships.");
    }
}

function makeMove() {
    // Simple Random AI
    let x, y, idx;
    let attempts = 0;

    // Find a spot we haven't shot yet
    do {
        x = Math.floor(Math.random() * 10);
        y = Math.floor(Math.random() * 10);
        idx = y * 10 + x;
        attempts++;
    } while (enemyBoard[idx] !== 0 && attempts < 200);

    enemyBoard[idx] = 1; // Mark as shot
    console.log(`Shooting at (${x}, ${y})...`);
    socket.emit('shoot', { gameId, x, y });
}
