const io = require('socket.io-client');
const socket = io('http://localhost:3000');

// Import DDD domain objects
const { domain } = require('./src');

const GAME_ID_PATTERN = /Match Found!/; // Not used directly, but logical context
let gameId = null;
let myAircraft = [];
let myBoard = Array(100).fill(0); // 0: empty, 1: ship
let enemyBoard = Array(100).fill(0); // 0: unknown, 1: shot
let isMyTurn = false;

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

function isValidAircraftPlacement(position, orientation, existingAircraft = []) {
    try {
        // Use the Aircraft class to validate placement
        return domain.Aircraft.canPlaceAt(position, orientation,
            existingAircraft.flatMap(aircraft =>
                aircraft.parts.map(part => part.coordinate)
            )
        );
    } catch (error) {
        return false;
    }
}

function placeShips() {
    console.log("Placing aircraft...");
    const aircraftConfigs = [];
    const placedAircraft = [];
    let attempts = 0;

    while (aircraftConfigs.length < 3 && attempts < 1000) {
        attempts++;
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';

        const position = new domain.Coordinate(x, y);

        if (isValidAircraftPlacement(position, orientation, placedAircraft)) {
            // Create the aircraft to get its parts
            const aircraft = new domain.Aircraft(`aircraft-${aircraftConfigs.length + 1}`, position, orientation);
            placedAircraft.push(aircraft);

            // Convert to server format
            aircraftConfigs.push({
                position: { x, y },
                orientation: orientation
            });
        }
    }

    if (aircraftConfigs.length === 3) {
        console.log("Aircraft placed successfully.");
        myAircraft = placedAircraft;

        // Update internal board representation
        placedAircraft.forEach(aircraft => {
            aircraft.parts.forEach(part => {
                const idx = part.coordinate.y * 10 + part.coordinate.x;
                myBoard[idx] = 1; // Mark as occupied
            });
        });

        socket.emit('place_ships', { gameId, ships: aircraftConfigs });
    } else {
        console.error("Failed to place 3 aircraft.");
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
