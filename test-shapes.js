// Test script to verify web client and DDD Aircraft shapes match
const { domain } = require('./src');

// Simulate web client shape logic
function getWebClientShape(isHorizontal) {
    if (isHorizontal) {
        return [
            { x: 0, y: 0 }, // Head
            { x: -2, y: 1 }, { x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, // Wings
            { x: 0, y: 2 }, // Body
            { x: -1, y: 3 }, { x: 0, y: 3 }, { x: 1, y: 3 } // Tail
        ];
    } else {
        return [
            { x: 0, y: 0 }, // Head
            { x: 1, y: -2 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, // Wings
            { x: 2, y: 0 }, // Body
            { x: 3, y: -1 }, { x: 3, y: 0 }, { x: 3, y: 1 } // Tail
        ];
    }
}

function getAircraftCoords(aircraft) {
    return aircraft.parts.map(part => ({
        x: part.coordinate.x,
        y: part.coordinate.y
    }));
}

console.log('Testing ship shape consistency...');

// Test horizontal orientation (place at valid position and get relative coords)
const webHorizontal = getWebClientShape(true);
const dddHorizontal = new domain.Aircraft('test', new domain.Coordinate(3, 0), 'horizontal');
const dddHorizontalCoords = getAircraftCoords(dddHorizontal).map(coord => ({
    x: coord.x - 3, // Make relative to head position
    y: coord.y - 0
}));

console.log('Web Client Horizontal Shape:', webHorizontal);
console.log('DDD Horizontal Shape (relative):', dddHorizontalCoords);
console.log('Horizontal Match:', JSON.stringify(webHorizontal) === JSON.stringify(dddHorizontalCoords));

// Test vertical orientation (place at valid position and get relative coords)
const webVertical = getWebClientShape(false);
const dddVertical = new domain.Aircraft('test', new domain.Coordinate(0, 3), 'vertical');
const dddVerticalCoords = getAircraftCoords(dddVertical).map(coord => ({
    x: coord.x - 0, // Make relative to head position
    y: coord.y - 3
}));

console.log('Web Client Vertical Shape:', webVertical);
console.log('DDD Vertical Shape (relative):', dddVerticalCoords);
console.log('Vertical Match:', JSON.stringify(webVertical) === JSON.stringify(dddVerticalCoords));

console.log('Shape testing complete!');