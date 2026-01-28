const SHIP_SHAPE = [
    { x: 0, y: -1 },
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 }
];

function getShipCoords(cx, cy, rot) {
    return SHIP_SHAPE.map(p => {
        let x = p.x, y = p.y;
        if (rot === 90) { const temp = x; x = -y; y = temp; }
        else if (rot === 180) { x = -x; y = -y; }
        else if (rot === 270) { const temp = x; x = y; y = -temp; }
        return { x: cx + x, y: cy + y };
    });
}

function isValidPlacement(shipCoords, placedShips) {
    if (shipCoords.some(p => p.x < 0 || p.x >= 10 || p.y < 0 || p.y >= 10)) return false;
    for (const ship of placedShips) {
        for (const p of ship.coords) {
            if (shipCoords.some(c => c.x === p.x && c.y === p.y)) return false;
        }
    }
    return true;
}

function runTest() {
    let successes = 0;
    const TRIALS = 1000;

    for (let i = 0; i < TRIALS; i++) {
        const ships = [];
        let attempts = 0;

        while (ships.length < 3 && attempts < 1000) {
            attempts++;
            const x = Math.floor(Math.random() * 10);
            const y = Math.floor(Math.random() * 10);
            const rot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];

            const coords = getShipCoords(x, y, rot);

            if (isValidPlacement(coords, ships)) {
                ships.push({ coords });
            }
        }

        if (ships.length === 3) successes++;
    }

    console.log(`Success rate: ${successes}/${TRIALS} (${(successes / TRIALS) * 100}%)`);
}

runTest();
