// State management for authentication
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let isAnonymous = false;
let socketConnected = false;

// Backend configuration (supports separate frontend/backend deployment)
const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : '';
const SOCKET_URL = (typeof window !== 'undefined' && window.SOCKET_URL) ? window.SOCKET_URL : '';
function apiUrl(path) {
    const base = (window.API_BASE_URL || '').replace(/\/+$/, '');
    return `${base}${path}`;
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registered:', reg);

                // Check for updates every 60 seconds
                setInterval(() => {
                    reg.update();
                }, 60000);

                // Detect when a new service worker is waiting
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            if (confirm('🚀 New version available! Reload to update?')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch(err => console.log('Service Worker registration failed:', err));

        // Reload page when new service worker takes control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    });
}

// Connect to backend Socket.IO (if SOCKET_URL is empty, falls back to same-origin)
const socket = SOCKET_URL ? io(SOCKET_URL, {
    extraHeaders: {
        'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd'
    }
}) : io({
    extraHeaders: {
        'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd'
    }
});

// Socket event handlers
socket.on('connect', () => {
    console.log('Socket connected');
    socketConnected = true;
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
    socketConnected = false;
});

socket.on('authenticated', (data) => {
    console.log('Socket authenticated:', data.user.username);
});

socket.on('authentication_error', (error) => {
    console.error('Socket authentication error:', error.message);
    logout();
});

// Authentication functions
async function login(username, password) {
    try {
        const response = await fetch(apiUrl('/api/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd',
            },
            body: JSON.stringify({ username, password }),
        });

        const data = await response.json();
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            return { success: true };
        } else {
            return { success: false, message: data.message };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function register(username, email, password) {
    try {
        const response = await fetch(apiUrl('/api/auth/register'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();
        return data;
    } catch (error) {
        return { success: false, message: 'Network error' };
    }
}

async function verifyAuth() {
    if (!authToken) return false;

    try {
        const response = await fetch(apiUrl('/api/auth/verify'), {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd',
            },
        });

        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
            return true;
        } else {
            logout();
            return false;
        }
    } catch (error) {
        logout();
        return false;
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    showScreen('login');
}

// Socket authentication
function authenticateSocket() {
    if (authToken) {
        socket.emit('authenticate', authToken);
    }
}

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
        log_enemy_fired: "Enemy fired at",
        review: "REVIEW BATTLEFIELD",
        leave_game: "LEAVE GAME",
        confirm_ship: "CONFIRM SHIP",
        deploy_last: "DEPLOY SQUADRON",
        play_as_guest: "PLAY AS GUEST",
        guest_note: "Play without registration - no stats saved",
        or_divider: "OR",
        sign_up: "SIGN UP",
        login: "LOGIN",
        remember_me: "Remember me",
        forgot_password: "Forgot password?"
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
        log_enemy_fired: "敌方攻击了",
        review: "查看战场",
        leave_game: "离开游戏",
        confirm_ship: "确认战机",
        deploy_last: "部署编队",
        play_as_guest: "游客模式",
        guest_note: "无需注册即可游玩 - 不会保存战绩",
        or_divider: "或",
        sign_up: "注册",
        login: "登录",
        remember_me: "记住我",
        forgot_password: "忘记密码？"
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
let gameId = null;
let isMyTurn = false;
let PLACED_SHIPS = [];
let pendingShip = null;

// Placement Logic consts
const SHIP_SHAPE = [
    { x: 0, y: -1 }, // Head
    { x: -2, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, // Wings (5 wide)
    { x: 0, y: 1 }, // Body
    { x: -1, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 2 } // Tail
]; // Total 10 cells

// DOM Elements - initialized lazily
let screens = {};

function getScreens() {
    if (Object.keys(screens).length === 0) {
        screens = {
            login: document.getElementById('login-screen'),
            lobby: document.getElementById('lobby-screen'),
            placement: document.getElementById('placement-screen'),
            game: document.getElementById('game-screen'),
            result: document.getElementById('result-screen'),
            profile: document.getElementById('profile-screen')
        };
    }
    return screens;
}

function showScreen(name) {
    const screenElements = getScreens();

    if (!screenElements[name]) {
        console.error('Screen not found:', name);
        return;
    }

    Object.values(screenElements).forEach(s => {
        if (s) s.classList.remove('active');
    });
    screenElements[name].classList.add('active');
}

// Anonymous play handler
document.getElementById('play-anonymous-btn').addEventListener('click', () => {
    isAnonymous = true;
    currentUser = null;
    authToken = null;
    updateUserDisplay();
    showScreen('lobby');
});

// Lobby Logic
document.getElementById('join-btn').addEventListener('click', () => {
    // Determine if this should be an anonymous game based on current user state
    const shouldPlayAnonymous = isAnonymous || (!currentUser && !authToken);
    if (!socketConnected) {
        document.getElementById('status-msg').innerText = 'Connecting... Please wait.';
        return;
    }

    socket.emit('join_game', { anonymous: shouldPlayAnonymous });
    document.getElementById('status-msg').innerText = t('searching');
});

document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
});

document.getElementById('profile-btn').addEventListener('click', () => {
    loadProfile();
    showScreen('profile');
});

// Authentication form handlers
document.getElementById('login-tab').addEventListener('click', () => {
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('register-tab').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
    // Clear any messages when switching tabs
    document.getElementById('login-msg').textContent = '';
    document.getElementById('register-msg').textContent = '';
});

document.getElementById('register-tab').addEventListener('click', () => {
    document.getElementById('register-tab').classList.remove('active');
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('register-tab').classList.add('active');
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    // Clear any messages when switching tabs
    document.getElementById('login-msg').textContent = '';
    document.getElementById('register-msg').textContent = '';
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    const msgEl = document.getElementById('login-msg');


    if (!username || !password) {
        msgEl.textContent = 'Please fill in all fields';
        msgEl.style.color = 'var(--neon-red)';
        return;
    }

    msgEl.textContent = 'Logging in...';
    msgEl.style.color = 'var(--text-color)';

    const result = await login(username, password);

    if (result.success) {
        // Handle remember me functionality
        if (rememberMe) {
            // Token is already stored in localStorage by the login function
        }

        msgEl.textContent = 'Login successful! Welcome back.';
        msgEl.style.color = 'var(--neon-green)';

        showScreen('lobby');
        updateUserDisplay();
    } else {
        msgEl.textContent = result.message;
        msgEl.style.color = 'var(--neon-red)';
    }
});

document.getElementById('register-btn').addEventListener('click', async () => {
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const msgEl = document.getElementById('register-msg');

    if (!username || !email || !password || !confirmPassword) {
        msgEl.textContent = 'Please fill in all fields';
        return;
    }

    if (password !== confirmPassword) {
        msgEl.textContent = 'Passwords do not match';
        return;
    }

    if (password.length < 6) {
        msgEl.textContent = 'Password must be at least 6 characters';
        return;
    }

    msgEl.textContent = 'Registering...';
    const result = await register(username, email, password);

    if (result.success) {
        msgEl.textContent = 'Registration successful! Switching to login...';
        msgEl.style.color = 'var(--neon-green)';

        setTimeout(() => {
            // Switch to login tab
            document.getElementById('login-tab').click();
            document.getElementById('login-username').value = username;
            document.getElementById('register-msg').textContent = '';
        }, 1500);
    } else {
        msgEl.textContent = result.message;
        msgEl.style.color = 'var(--neon-red)';
    }
});

// Password toggle functionality
document.getElementById('login-password-toggle').addEventListener('click', function() {
    const passwordInput = document.getElementById('login-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('register-password-toggle').addEventListener('click', function() {
    const passwordInput = document.getElementById('register-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('register-confirm-password-toggle').addEventListener('click', function() {
    const passwordInput = document.getElementById('register-confirm-password');
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.textContent = type === 'password' ? '👁️' : '🙈';
});

document.getElementById('forgot-password-link').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Password reset functionality is not implemented yet. Please contact support or create a new account.');
});

socket.on('waiting', (msg) => {
    document.getElementById('status-msg').innerText = msg;
});

socket.on('game_start', (data) => {
    gameId = data.gameId;
    document.getElementById('status-msg').innerText = "Match Found!";
    setTimeout(() => {
        showScreen('placement');
        initPlacementBoard();
        updateDeployButton(); // Update button text initially
    }, 1000);
});

// Placement Logic
function initPlacementBoard() {
    const board = document.getElementById('placement-board');
    board.innerHTML = '';

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = x;
            cell.dataset.y = y;

            // Mouse Interaction
            cell.addEventListener('mouseenter', () => previewShip(x, y));
            cell.addEventListener('mouseleave', () => clearPreview());
            cell.addEventListener('click', () => placeShip(x, y));

            board.appendChild(cell);
        }
    }

    // Mobile: Touch Events (Container Level)
    board.addEventListener('touchstart', handleTouch, { passive: false });
    board.addEventListener('touchmove', handleTouch, { passive: false });
    board.addEventListener('touchend', handleTouchEnd);
}

// Touch Handling (No changes needed, re-using existing flow)
let lastTouchTarget = null;
function handleTouch(e) {
    if (e.target.closest('.grid-board')) {
        e.preventDefault(); // Stop scrolling
    }
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (target && target.classList.contains('cell')) {
        if (lastTouchTarget !== target) {
            const x = parseInt(target.dataset.x);
            const y = parseInt(target.dataset.y);
            previewShip(x, y);
            lastTouchTarget = target;
        }
    }
}

function handleTouchEnd(e) {
    if (lastTouchTarget) {
        const x = parseInt(lastTouchTarget.dataset.x);
        const y = parseInt(lastTouchTarget.dataset.y);
        placeShip(x, y);
        clearPreview();
        lastTouchTarget = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        rotation = (rotation + 90) % 360;
        // If we have a pending ship, re-orient it immediately
        if (pendingShip) {
            placeShip(pendingShip.core.x, pendingShip.core.y);
        }
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

    // Check overlap with CONFIRMED ships
    for (const ship of PLACED_SHIPS) {
        for (const p of ship.coords) {
            if (coords.some(c => c.x === p.x && c.y === p.y)) return false;
        }
    }
    return true;
}

function previewShip(x, y) {
    if (PLACED_SHIPS.length >= 3) return; // Max 3 confirmed ships

    clearPreview();
    const coords = getShipCoords(x, y, rotation);
    const valid = isValidPlacement(coords);

    coords.forEach(p => {
        if (p.x >= 0 && p.x < 10 && p.y >= 0 && p.y < 10) {
            const idx = p.y * 10 + p.x;
            const cell = document.getElementById('placement-board').children[idx];
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
    if (PLACED_SHIPS.length >= 3) return; // Max 3 confirmed

    const coords = getShipCoords(x, y, rotation);

    if (isValidPlacement(coords)) {
        // Set as PENDING, don't confirm yet
        pendingShip = { coords, core: { x, y }, rotation };
        renderPlacementBoard();

        // Show confirm button
        document.getElementById('confirm-placement-btn').style.display = 'block';
        updateDeployButton();
    } else {
        // If invalid, clear pending ship and hide button
        pendingShip = null;
        renderPlacementBoard(); // Re-render to clear any old pending display
        document.getElementById('confirm-placement-btn').style.display = 'none';
        updateDeployButton();
    }
}

function renderPlacementBoard() {
    const board = document.getElementById('placement-board');
    // Clear 'ship' class but KEEP grid structure
    Array.from(board.children).forEach(c => {
        c.classList.remove('ship', 'pending');
    });

    // Render CONFIRMED ships
    PLACED_SHIPS.forEach(ship => {
        ship.coords.forEach(p => {
            const idx = p.y * 10 + p.x;
            board.children[idx].classList.add('ship');
        });
    });

    // Render PENDING ship (different style?)
    if (pendingShip) {
        pendingShip.coords.forEach(p => {
            const idx = p.y * 10 + p.x;
            board.children[idx].classList.add('ship', 'pending'); // 'pending' can correspond to 'preview' style or similar
        });
    }
}

function updateDeployButton() {
    const btn = document.getElementById('confirm-placement-btn');
    const totalConfirmed = PLACED_SHIPS.length;

    if (totalConfirmed === 3) {
        // All ships placed and confirmed, button should be hidden or already triggered deploy
        btn.style.display = 'none';
        return;
    }

    if (pendingShip) {
        if (totalConfirmed === 2) {
            btn.innerText = t("deploy_last"); // Final deploy
        } else {
            btn.innerText = `${t("confirm_ship")} (${totalConfirmed + 1}/3)`;
        }
        btn.disabled = false;
        btn.style.display = 'block'; // Ensure it's visible when a pending ship exists
    } else {
        // No pending ship selected yet for this slot
        btn.style.display = 'none'; // Hide if no pending ship to confirm
    }
}

document.getElementById('rotate-btn').addEventListener('click', () => {
    rotation = (rotation + 90) % 360;
    // If we have a pending ship, re-orient it immediately
    if (pendingShip) {
        // Try to re-place at same core coords
        placeShip(pendingShip.core.x, pendingShip.core.y);
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    PLACED_SHIPS = [];
    pendingShip = null;
    renderPlacementBoard();
    updateDeployButton();
    document.getElementById('confirm-placement-btn').style.display = 'none';
});

document.getElementById('confirm-placement-btn').addEventListener('click', () => {
    if (pendingShip) {
        PLACED_SHIPS.push(pendingShip);
        pendingShip = null;
        renderPlacementBoard();

        if (PLACED_SHIPS.length === 3) {
            socket.emit('place_ships', { gameId, ships: PLACED_SHIPS });
            document.getElementById('placement-msg').innerText = t('waiting_opponent');
            document.getElementById('confirm-placement-btn').style.display = 'none';
            document.getElementById('reset-btn').style.display = 'none';
            document.getElementById('rotate-btn').style.display = 'none';
        } else {
            updateDeployButton();
            document.getElementById('confirm-placement-btn').style.display = 'none';
        }
    }
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
        enemyBoard.style.pointerEvents = 'auto'; // Enable clicking
    } else {
        turnDisplay.innerText = t('enemy_turn');
        turnDisplay.classList.remove('my-turn');
        enemyBoard.classList.add('locked');
        enemyBoard.style.pointerEvents = 'none'; // Disable clicking completely
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

socket.on('game_over', ({ result, opponentShips }) => {
    // result = 'win' or 'lose'
    // Do NOT switch screen, just show result overlay
    document.getElementById('result-screen').classList.add('active');
    document.getElementById('leave-btn').style.display = 'block'; // Show leave button in HUD

    const title = document.getElementById('result-title');
    if (result === 'win') {
        title.innerText = t('victory');
        title.style.color = "var(--neon-green)";
    } else {
        title.innerText = t('defeat');
        title.style.color = "var(--neon-red)";
    }

    // Reveal Opponent Ships
    if (opponentShips) {
        opponentShips.forEach(ship => {
            ship.coords.forEach(p => {
                const idx = p.y * 10 + p.x;
                const cell = enemyBoard.children[idx];
                // Only reveal if not already hit/fatal/miss (i.e., if it looks empty)
                if (!cell.classList.contains('hit') && !cell.classList.contains('fatal')) {
                    cell.classList.add('revealed');
                }
            });
        });
    }
});

// Game Over Review Controls
document.getElementById('review-btn').addEventListener('click', () => {
    document.getElementById('result-screen').classList.remove('active');
});

document.getElementById('leave-btn').addEventListener('click', () => {
    location.reload();
});

socket.on('error', (msg) => {
    alert(msg);
});

// Profile and user display functions
function updateUserDisplay() {
    const userInfoSection = document.getElementById('user-info-section');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');
    const loginPromptBtn = document.getElementById('login-prompt-btn');

    if (currentUser) {
        // Authenticated user
        document.getElementById('user-greeting').textContent = `Welcome, ${currentUser.username}!`;
        document.getElementById('profile-user-greeting').textContent = `Welcome, ${currentUser.username}!`;
        logoutBtn.style.display = 'inline-block';
        profileBtn.style.display = 'inline-block';
        loginPromptBtn.style.display = 'none';
    } else if (isAnonymous) {
        // Anonymous user
        document.getElementById('user-greeting').textContent = 'Playing as Guest';
        logoutBtn.style.display = 'none';
        profileBtn.style.display = 'none';
        loginPromptBtn.style.display = 'inline-block';
        loginPromptBtn.textContent = t('sign_up');
    } else {
        // Not logged in (shouldn't reach here in normal flow)
        document.getElementById('user-greeting').textContent = 'Welcome!';
        logoutBtn.style.display = 'none';
        profileBtn.style.display = 'none';
        loginPromptBtn.style.display = 'inline-block';
        loginPromptBtn.textContent = t('login');
    }
}

async function loadProfile() {
    if (!authToken) return;

    try {
        // Load user stats
        const profileResponse = await fetch(apiUrl('/api/user/profile'), {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd',
            },
        });

        const profileData = await profileResponse.json();
        if (profileData.success) {
            const stats = profileData.user.stats;
            document.getElementById('stat-games-played').textContent = stats.gamesPlayed;
            document.getElementById('stat-games-won').textContent = stats.gamesWon;
            document.getElementById('stat-games-lost').textContent = stats.gamesLost;
            document.getElementById('stat-win-rate').textContent = `${stats.winRate.toFixed(1)}%`;
            document.getElementById('stat-total-shots').textContent = stats.totalShots;
            const accuracy = stats.totalShots > 0 ? ((stats.hits / stats.totalShots) * 100).toFixed(1) : 0;
            document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
        }

        // Load recent games
        const historyResponse = await fetch(apiUrl('/api/user/recent-games?limit=10'), {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'x-vercel-protection-bypass': 'sez6eiUP1XDRUMhLgJF2rLmFVEdVCvkd',
            },
        });

        const historyData = await historyResponse.json();
        if (historyData.success) {
            displayGameHistory(historyData.games);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function displayGameHistory(games) {
    const historyEl = document.getElementById('game-history');

    if (!games || games.length === 0) {
        historyEl.innerHTML = '<p class="no-history">No games played yet.</p>';
        return;
    }

    historyEl.innerHTML = games.map(game => {
        const date = new Date(game.started_at).toLocaleDateString();
        const duration = game.duration_seconds ? `${Math.floor(game.duration_seconds / 60)}:${(game.duration_seconds % 60).toString().padStart(2, '0')}` : 'Ongoing';
        const resultClass = game.result === 'win' ? 'win' : game.result === 'lose' ? 'loss' : 'ongoing';
        const opponent = game.result === 'win' ? game.player2_username : game.player1_username;

        return `
            <div class="history-item">
                <div>
                    <div class="history-game-id">${game.game_id}</div>
                    <div class="history-opponent">vs ${opponent}</div>
                    <div class="history-date">${date} • ${duration}</div>
                </div>
                <div class="history-result ${resultClass}">${game.result}</div>
            </div>
        `;
    }).join('');
}

document.getElementById('profile-back-btn').addEventListener('click', () => {
    showScreen('lobby');
});

document.getElementById('login-prompt-btn').addEventListener('click', () => {
    showScreen('login');
});

// Initialize app
async function initApp() {
    // Try to verify existing authentication
    if (authToken) {
        const isValid = await verifyAuth();
        if (isValid) {
            showScreen('lobby');
            updateUserDisplay();
            return;
        } else {
            // Clear invalid token
            localStorage.removeItem('authToken');
            authToken = null;
        }
    }

    // Always show login screen first - users must choose anonymous or authenticated play
    showScreen('login');
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
