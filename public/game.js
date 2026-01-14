const socket = io();

// State
let myShips = [];
let rotation = 0; // 0, 90, 180, 270
const SHIP_SHAPE = [
    { x: 0, y: -1 }, // Head
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, // Neck/Wings (5 wide)
    { x: 0, y: 1 }, // Body
    { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 } // Tail (3 wide)
    // 10 parts total. "User Heavy Bomber"
    //      H
    //    WWBWW
    //      B
    //     TTT
];

// DOM Elements
const screens = {
    lobby: document.getElementById('lobby-screen'),
    placement: document.getElementById('placement-screen'),
    game: document.getElementById('game-screen'),
    result: document.getElementById('result-screen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// Lobby Logic
document.getElementById('join-btn').addEventListener('click', () => {
    socket.emit('join_game');
    document.getElementById('status-msg').innerText = "Searching for opponent...";
});

socket.on('waiting', (msg) => {
    document.getElementById('status-msg').innerText = msg;
});

socket.on('game_start', (data) => {
    console.log('Game Started:', data);
    gameId = data.gameId;
    showScreen('placement');
    initPlacementBoard();
});

// Placement Logic
let gameId = null;
const placementBoard = document.getElementById('placement-board');
const PLACED_SHIPS = [];
const MAX_SHIPS = 3;

function initPlacementBoard() {
    placementBoard.innerHTML = '';
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener('mouseenter', () => previewShip(x, y));
            cell.addEventListener('mouseleave', () => clearPreview());
            cell.addEventListener('click', () => placeShip(x, y));

            placementBoard.appendChild(cell);
        }
    }
}

document.getElementById('rotate-btn').addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        rotation = (rotation + 90) % 360;
        // Refresh preview if mouse is hovering
    }
});

function getTransformedShape(rot) {
    // Basic rotation logic around (0,0)
    return SHIP_SHAPE.map(p => {
        let x = p.x;
        let y = p.y;
        if (rot === 90) { let temp = x; x = -y; y = temp; }
        else if (rot === 180) { x = -x; y = -y; }
        else if (rot === 270) { let temp = x; x = y; y = -temp; }
        return { x, y };
    });
}

function getShipCoords(cx, cy, rot) {
    const shape = getTransformedShape(rot);
    return shape.map(p => ({ x: cx + p.x, y: cy + p.y }));
}

function isValidPlacement(coords) {
    // Check bounds
    if (coords.some(p => p.x < 0 || p.x >= 10 || p.y < 0 || p.y >= 10)) return false;

    // Check overlap
    for (const ship of PLACED_SHIPS) {
        for (const p of ship.coords) {
            if (coords.some(c => c.x === p.x && c.y === p.y)) return false;
        }
    }
    return true;
}

function previewShip(x, y) {
    if (PLACED_SHIPS.length >= MAX_SHIPS) return;

    clearPreview();
    const coords = getShipCoords(x, y, rotation);
    const valid = isValidPlacement(coords);

    coords.forEach(p => {
        if (p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10) {
            const idx = p.y * 10 + p.x;
            const cell = placementBoard.children[idx];
            cell.classList.add(valid ? 'preview' : 'preview-invalid');
        }
    });
}

function clearPreview() {
    document.querySelectorAll('.preview, .preview-invalid').forEach(el => {
        el.classList.remove('preview');
        el.classList.remove('preview-invalid');
    });
}

function placeShip(x, y) {
    if (PLACED_SHIPS.length >= MAX_SHIPS) return;

    const coords = getShipCoords(x, y, rotation);
    if (!isValidPlacement(coords)) return;

    PLACED_SHIPS.push({ coords, rotation, core: { x, y } });

    // Draw permanently
    coords.forEach(p => {
        const idx = p.y * 10 + p.x;
        placementBoard.children[idx].classList.add('ship');
    });

    if (PLACED_SHIPS.length === MAX_SHIPS) {
        document.getElementById('confirm-placement-btn').style.display = 'block';
    }
}

document.getElementById('confirm-placement-btn').addEventListener('click', () => {
    socket.emit('place_ships', { gameId, ships: PLACED_SHIPS });
    document.getElementById('placement-msg').innerText = "Waiting for other player...";
    document.getElementById('confirm-placement-btn').disabled = true;
});

// Gameplay Logic
const myBoard = document.getElementById('my-board');
const enemyBoard = document.getElementById('enemy-board');

function initGameBoards() {
    myBoard.innerHTML = '';
    enemyBoard.innerHTML = '';

    // My Board (Show my ships)
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            // Check if ship exists here
            let isShip = false;
            for (const ship of PLACED_SHIPS) {
                if (ship.coords.some(p => p.x === x && p.y === y)) isShip = true;
            }
            if (isShip) cell.classList.add('ship');
            myBoard.appendChild(cell);
        }
    }

    // Enemy Board (Clickable)
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.addEventListener('click', () => shoot(x, y));
            enemyBoard.appendChild(cell);
        }
    }
}

socket.on('round_start', ({ yourTurn }) => {
    showScreen('game');
    initGameBoards();
    updateTurnUI(yourTurn);
});

function updateTurnUI(isMyTurn) {
    const turnDisplay = document.getElementById('turn-display');
    if (isMyTurn) {
        turnDisplay.innerText = "YOUR TURN";
        turnDisplay.classList.add('my-turn');
        enemyBoard.classList.remove('locked');
    } else {
        turnDisplay.innerText = "ENEMY TURN";
        turnDisplay.classList.remove('my-turn');
        enemyBoard.classList.add('locked');
    }
}

function shoot(x, y) {
    socket.emit('shoot', { gameId, x, y });
}

socket.on('shot_result', ({ x, y, result, isMyShot }) => {
    const board = isMyShot ? enemyBoard : myBoard;
    const idx = y * 10 + x;
    const cell = board.children[idx];

    cell.classList.add(result); // 'hit' or 'miss'

    const msg = isMyShot ? `You fired at (${x},${y}): ${result.toUpperCase()}` : `Enemy fired at (${x},${y}): ${result.toUpperCase()}`;
    document.getElementById('game-log').innerText = msg;
});

socket.on('turn_change', (isMyTurn) => {
    updateTurnUI(isMyTurn);
});

socket.on('game_over', (result) => {
    // result = 'win' or 'lose'
    showScreen('result');
    const title = document.getElementById('result-title');
    if (result === 'win') {
        title.innerText = "VICTORY ACHIEVED";
        title.style.color = "var(--neon-green)";
    } else {
        title.innerText = "MISSION FAILED";
        title.style.color = "var(--neon-red)";
    }
});

socket.on('error', (msg) => {
    alert(msg);
});
