// Simple test to validate DDD implementation
const { domain } = require('./src');
const Player = domain.Player;

console.log('Testing DDD Domain Objects...');

// Test Coordinate
const coord = new domain.Coordinate(5, 5);
console.log('✓ Coordinate created:', coord.toString());

// Test PlayerId
const playerId = domain.PlayerId.fromString('test-player-123');
console.log('✓ PlayerId created:', playerId.toString());

// Test Aircraft
const aircraft = new domain.Aircraft('test-aircraft', coord, 'horizontal');
console.log('✓ Aircraft created with', aircraft.parts.length, 'parts');

// Test Player
const player = new Player(playerId);
console.log('✓ Player created:', player.toString());

// Test aircraft placement
try {
    // Player must place exactly 3 aircraft with no overlap
    const aircraftConfigs = [
        { position: { x: 2, y: 0 }, orientation: 'horizontal' }, // Occupies left side
        { position: { x: 7, y: 0 }, orientation: 'horizontal' }, // Occupies right side
        { position: { x: 2, y: 5 }, orientation: 'horizontal' }  // Occupies bottom
    ];
    player.placeAircraft(aircraftConfigs);
    console.log('✓ All aircraft placed successfully');

    // Test shot processing
    const shotResult = player.processShot(new domain.Coordinate(2, 0)); // Hit head
    console.log('✓ Shot processed:', shotResult.result, shotResult.isHeadHit ? '(head hit)' : '');
} catch (error) {
    console.log('✗ Aircraft placement failed:', error.message);
}

console.log('Domain tests completed!');