// Test script for anonymous play functionality
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

function testAnonymousPlay() {
    console.log('Testing anonymous play functionality...\n');

    // Test 1: Anonymous player joins game
    console.log('Test 1: Anonymous player joining game');
    const socket1 = io(SERVER_URL);

    socket1.on('connect', () => {
        console.log('Anonymous player 1 connected');

        // Join game as anonymous
        socket1.emit('join_game', { anonymous: true });
    });

    socket1.on('waiting', (msg) => {
        console.log('Anonymous player 1:', msg);

        // Test 2: Second anonymous player joins
        console.log('\nTest 2: Second anonymous player joining');
        const socket2 = io(SERVER_URL);

        socket2.on('connect', () => {
            console.log('Anonymous player 2 connected');
            socket2.emit('join_game', { anonymous: true });
        });

        socket2.on('game_start', (data) => {
            console.log('Anonymous game started:', data);
            console.log('✅ Anonymous play test passed!');

            // Clean up
            socket1.disconnect();
            socket2.disconnect();
            console.log('\nAll tests completed successfully!');
            process.exit(0);
        });

        socket2.on('waiting', (msg) => {
            console.log('Anonymous player 2:', msg);
        });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
        console.log('❌ Test timed out');
        process.exit(1);
    }, 10000);
}

testAnonymousPlay();