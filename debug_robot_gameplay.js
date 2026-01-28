const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const client = io(SERVER_URL);
let gameId = null;
let myId = null;

// Valid ship placement for the user (hardcoded valid spot)
// Center at 5,5
const SHIP_SHAPE = [
    { x: 0, y: -1 }, { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 }
];
function getShipCoords(cx, cy) {
    return SHIP_SHAPE.map(p => ({ x: cx + p.x, y: cy + p.y }));
}

// 3 placements
const PLACEMENTS = [
    { coords: getShipCoords(5, 2), core: { x: 5, y: 2 }, rotation: 0 },
    { coords: getShipCoords(2, 6), core: { x: 2, y: 6 }, rotation: 0 },
    { coords: getShipCoords(7, 7), core: { x: 7, y: 7 }, rotation: 0 }
];

console.log('Connecting to server...');

client.on('connect', () => {
    console.log('User connected:', client.id);
    myId = client.id;
    client.emit('join_game', { anonymous: true });
});

client.on('game_start', (data) => {
    console.log('Game Started:', data);
    gameId = data.gameId;

    // Immediately place ships
    console.log('Placing user ships...');
    client.emit('place_ships', { gameId, ships: PLACEMENTS });
});

client.on('round_start', ({ yourTurn }) => {
    console.log(`Round Started. User Turn: ${yourTurn}`);

    if (yourTurn) {
        console.log('User shooting at 0,0...');
        client.emit('shoot', { gameId, x: 0, y: 0 });
    }
});

client.on('turn_change', (isMyTurn) => {
    console.log(`Turn Changed. User Turn: ${isMyTurn}`);
    if (isMyTurn) {
        console.log('User shooting at 0,0 (again/random)...');
        client.emit('shoot', { gameId, x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) });
    }
});

client.on('shot_result', (data) => {
    if (!data.isMyShot) {
        console.log(`SUCCESS: Robot shot at me (${data.x}, ${data.y}): ${data.result}`);
        process.exit(0);
    } else {
        console.log(`User shot result: ${data.result}`);
    }
});

// Timeout
setTimeout(() => {
    console.error('FAILURE: Timeout waiting for gameplay interaction.');
    process.exit(1);
}, 20000); // 20s timeout
