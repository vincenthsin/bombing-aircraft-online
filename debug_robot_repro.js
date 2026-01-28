const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const socket = io(SERVER_URL);

console.log('Connecting to server...');

socket.on('connect', () => {
    console.log('User connected:', socket.id);
    console.log('Joining game queue...');
    socket.emit('join_game', { anonymous: true });
});

socket.on('waiting', (msg) => {
    console.log('Received waiting message:', msg);
    console.log('Waiting for 6 seconds to see if robot appears...');
});

socket.on('game_start', (data) => {
    console.log('SUCCESS: Game started!', data);
    process.exit(0);
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
    console.error('FAILURE: Timed out waiting for robot match.');
    process.exit(1);
}, 10000);
