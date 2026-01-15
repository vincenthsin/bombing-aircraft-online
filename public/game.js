const socket = io();

// Localization
const TRANSLATIONS = {
    en: {
        title: "BOMBING AIRCRAFT",
        subtitle: "TACTICAL ONLINE WARFARE",
        find_match: "FIND MATCH",
        searching: "Searching for opponent...",
        place_header: "ENSURE AIR SUPERIORITY",
        place_instruction: "Deploy your 3 aircraft.",
        deploy: "DEPLOY SQUADRON",
        rotate: "ROTATE (R)",
        reset: "RESET BOARD",
        waiting_opponent: "Waiting for other player...",
        you: "YOU",
        enemy: "ENEMY",
        waiting: "WAITING...",
        my_airspace: "MY AIRSPACE",
        enemy_radar: "ENEMY RADAR",
        system_init: "System Initialized...",
        your_turn: "YOUR TURN",
        enemy_turn: "ENEMY TURN",
        return_base: "RETURN TO BASE",
        victory: "VICTORY ACHIEVED",
        defeat: "MISSION FAILED",
        log_miss: "MISS",
        log_hit: "HIT",
        log_fatal: "FATAL",
        log_you_fired: "You fired at",
        log_enemy_fired: "Enemy fired at"
    },
    zh: {
        title: "炸飞机 OL",
        subtitle: "线上战术对决",
        find_match: "寻找对局",
        searching: "正在寻找对手...",
        place_header: "确保制空权",
        place_instruction: "部署您的 3 架战机。",
        deploy: "部署编队",
        rotate: "旋转 (R)",
        reset: "重置棋盘",
        waiting_opponent: "等待对手...",
        you: "我方",
        enemy: "敌方",
        waiting: "等待中...",
        my_airspace: "我方空域",
        enemy_radar: "敌方雷达",
        system_init: "系统初始化完成...",
        your_turn: "你的回合",
        enemy_turn: "对手回合",
        return_base: "返回基地",
        victory: "任务完成",
        defeat: "任务失败",
        log_miss: "未击中",
        log_hit: "命中",
        log_fatal: "击毁机头",
        log_you_fired: "你攻击了",
        log_enemy_fired: "敌方攻击了"
    }
};

let currentLang = 'en';

function initLocalization() {
    // Detect language: Default to 'en', switch to 'zh' if navigator.language starts with 'zh'
    const browserLang = navigator.language || navigator.userLanguage;
    currentLang = browserLang.startsWith('zh') ? 'zh' : 'en';

    console.log("Detected Language:", browserLang, "=>", currentLang);
    applyTranslations();
}

function applyTranslations() {
    const texts = TRANSLATIONS[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) el.innerText = texts[key];
    });
}

function t(key) {
    return TRANSLATIONS[currentLang][key] || key;
}

// Init immediately
initLocalization();


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
    document.getElementById('status-msg').innerText = t('searching');
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

    // PC: Mouse Events
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

    // Mobile: Touch Events (Container Level)
    placementBoard.addEventListener('touchstart', handleTouch, { passive: false });
    placementBoard.addEventListener('touchmove', handleTouch, { passive: false });
    placementBoard.addEventListener('touchend', handleTouchEnd, { passive: false });
}

let lastTouchTarget = null;

function handleTouch(e) {
    if (e.target.closest('.grid-board')) {
        e.preventDefault(); // Stop scrolling
    }

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);

    if (element && element.classList.contains('cell')) {
        const x = parseInt(element.dataset.x);
        const y = parseInt(element.dataset.y);

        if (lastTouchTarget !== element) {
            previewShip(x, y);
            lastTouchTarget = element;
        }
    } else {
        clearPreview();
        lastTouchTarget = null;
    }
}

function handleTouchEnd(e) {
    if (lastTouchTarget) {
        const x = parseInt(lastTouchTarget.dataset.x);
        const y = parseInt(lastTouchTarget.dataset.y);
        placeShip(x, y);
        clearPreview(); // Clear preview after placing
        lastTouchTarget = null;
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
    document.getElementById('placement-msg').innerText = t('waiting_opponent');
    document.getElementById('confirm-placement-btn').disabled = true;
    document.getElementById('reset-btn').style.display = 'none'; // Hide reset after confirm
    document.getElementById('rotate-btn').style.display = 'none';
});

document.getElementById('reset-btn').addEventListener('click', () => {
    PLACED_SHIPS.length = 0; // Clear array
    // Remove all 'ship' classes from board
    document.querySelectorAll('#placement-board .cell').forEach(cell => {
        cell.classList.remove('ship');
    });
    document.getElementById('confirm-placement-btn').style.display = 'none';
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
        turnDisplay.innerText = t('your_turn');
        turnDisplay.classList.add('my-turn');
        enemyBoard.classList.remove('locked');
    } else {
        turnDisplay.innerText = t('enemy_turn');
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

    const msg = isMyTurn ? `${t('log_you_fired')} (${x},${y}): ${t('log_' + result)}` : `${t('log_enemy_fired')} (${x},${y}): ${t('log_' + result)}`;
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
        title.innerText = t('victory');
        title.style.color = "var(--neon-green)";
    } else {
        title.innerText = t('defeat');
        title.style.color = "var(--neon-red)";
    }
});

socket.on('error', (msg) => {
    alert(msg);
});
