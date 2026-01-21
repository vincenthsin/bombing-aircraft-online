// Admin Dashboard JavaScript
let socket = null;
let isAuthenticated = false;
let statsInterval = null;

const SESSION_KEY = 'admin_session_token';

// Backend configuration (supports separate frontend/backend deployment)
const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : '';
const SOCKET_URL = (typeof window !== 'undefined' && window.SOCKET_URL) ? window.SOCKET_URL : '';
function apiUrl(path) {
    const base = (API_BASE_URL || '').replace(/\/+$/, '');
    return `${base}${path}`;
}

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const authForm = document.getElementById('auth-form');
const passwordInput = document.getElementById('password-input');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const clearLogBtn = document.getElementById('clear-log-btn');

// Statistics Elements
const statActiveUsers = document.getElementById('stat-active-users');
const statActiveGames = document.getElementById('stat-active-games');
const statQueue = document.getElementById('stat-queue');
const statTotalGames = document.getElementById('stat-total-games');
const statPeakUsers = document.getElementById('stat-peak-users');
const statUptime = document.getElementById('stat-uptime');

// Table Elements
const usersCount = document.getElementById('users-count');
const gamesCount = document.getElementById('games-count');
const usersTbody = document.getElementById('users-tbody');
const gamesTbody = document.getElementById('games-tbody');
const eventLog = document.getElementById('event-log');

// Check for existing session on page load
async function checkExistingSession() {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (!token) return false;

    try {
        const response = await fetch(apiUrl('/api/admin/verify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        if (response.ok) {
            return true;
        } else {
            sessionStorage.removeItem(SESSION_KEY);
            return false;
        }
    } catch (error) {
        console.error('Session verification error:', error);
        return false;
    }
}

// Initialize on page load
(async function init() {
    const hasValidSession = await checkExistingSession();
    if (hasValidSession) {
        isAuthenticated = true;
        authScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        initializeDashboard();
    }
})();

// Authentication
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    try {
        const response = await fetch(apiUrl('/api/admin/auth'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            isAuthenticated = true;
            sessionStorage.setItem(SESSION_KEY, data.token);
            authScreen.classList.remove('active');
            dashboardScreen.classList.add('active');
            initializeDashboard();
            authError.textContent = '';
        } else {
            authError.textContent = '❌ Invalid password';
            passwordInput.value = '';
        }
    } catch (error) {
        authError.textContent = '❌ Connection error';
        console.error('Auth error:', error);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem(SESSION_KEY);
    
    // Notify server to invalidate the session
    if (token) {
        try {
            await fetch(apiUrl('/api/admin/logout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    sessionStorage.removeItem(SESSION_KEY);
    isAuthenticated = false;
    dashboardScreen.classList.remove('active');
    authScreen.classList.add('active');
    passwordInput.value = '';

    if (socket) {
        socket.disconnect();
        socket = null;
    }

    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }
});

// Clear Event Log
clearLogBtn.addEventListener('click', () => {
    eventLog.innerHTML = '<div class="log-entry system"><span class="log-time">' +
        getCurrentTime() + '</span><span class="log-message">Event log cleared</span></div>';
});

// Initialize Dashboard
function initializeDashboard() {
    // Connect to admin namespace
    socket = SOCKET_URL ? io(`${SOCKET_URL}/admin`) : io('/admin');

    socket.on('connect', () => {
        addLogEntry('system', 'Connected to admin server');
        console.log('Admin socket connected');
    });

    socket.on('disconnect', () => {
        addLogEntry('error', 'Disconnected from server');
    });

    // Listen for initial data
    socket.on('initial_data', (data) => {
        console.log('Initial data received:', data);
        updateAllData(data);
    });

    // Real-time events
    socket.on('user_connected', (data) => {
        addLogEntry('user', `User connected: ${truncateId(data.userId)} (Total: ${data.totalUsers})`);
        fetchUsers();
        fetchStats();
    });

    socket.on('user_disconnected', (data) => {
        addLogEntry('user', `User disconnected: ${truncateId(data.userId)} (Total: ${data.totalUsers})`);
        fetchUsers();
        fetchStats();
    });

    socket.on('game_created', (data) => {
        addLogEntry('game', `Game created: ${truncateId(data.gameId)} - Status: ${data.status}`);
        fetchGames();
        fetchStats();
    });

    socket.on('game_status_changed', (data) => {
        addLogEntry('game', `Game ${truncateId(data.gameId)} status: ${data.status}`);
        fetchGames();
    });

    socket.on('game_finished', (data) => {
        addLogEntry('game', `Game finished: ${truncateId(data.gameId)} - Winner: ${truncateId(data.winner)}`);
        fetchGames();
        fetchStats();
    });

    socket.on('queue_updated', (data) => {
        addLogEntry('system', `Queue ${data.action}: ${truncateId(data.userId)} (Length: ${data.queueLength})`);
        fetchStats();
    });

    socket.on('turn_changed', (data) => {
        addLogEntry('game', `Turn changed in ${truncateId(data.gameId)} - Now: ${truncateId(data.currentTurn)}`);
        fetchGames();
    });

    // Fetch initial data
    fetchStats();
    fetchUsers();
    fetchGames();

    // Set up periodic refresh
    statsInterval = setInterval(() => {
        fetchStats();
        fetchUsers();
        fetchGames();
    }, 5000); // Refresh every 5 seconds
}

// Fetch Statistics
async function fetchStats() {
    try {
        const response = await fetch(apiUrl('/api/admin/stats'));
        const stats = await response.json();

        statActiveUsers.textContent = stats.activeUsers;
        statActiveGames.textContent = stats.activeGames;
        statQueue.textContent = stats.queueLength;
        statTotalGames.textContent = stats.totalGamesPlayed;
        statPeakUsers.textContent = stats.peakConcurrentUsers;
        statUptime.textContent = formatUptime(stats.uptime);
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Fetch Users
async function fetchUsers() {
    try {
        const response = await fetch(apiUrl('/api/admin/users'));
        const users = await response.json();

        usersCount.textContent = users.length;

        if (users.length === 0) {
            usersTbody.innerHTML = '<tr class="empty-state"><td colspan="5">No users connected</td></tr>';
            return;
        }

        usersTbody.innerHTML = users.map(user => {
            let status = 'online';
            if (user.gameId) {
                status = user.gameStatus || 'in-game';
            } else if (user.inQueue) {
                status = 'waiting';
            }

            return `
                <tr>
                    <td class="text-truncate" title="${user.id}">${truncateId(user.id)}</td>
                    <td><span class="status-badge ${status}">${status}</span></td>
                    <td class="text-truncate" title="${user.ip || '-'}">${user.ip || '-'}</td>
                    <td>${formatTime(user.connectedAt)}</td>
                    <td class="text-truncate" title="${user.gameId || '-'}">${user.gameId ? truncateId(user.gameId) : '-'}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Fetch Games
async function fetchGames() {
    try {
        const response = await fetch(apiUrl('/api/admin/games'));
        const games = await response.json();

        const activeGames = games.filter(g => g.status !== 'finished');
        gamesCount.textContent = activeGames.length;

        if (activeGames.length === 0) {
            gamesTbody.innerHTML = '<tr class="empty-state"><td colspan="6">No active games</td></tr>';
            return;
        }

        gamesTbody.innerHTML = activeGames.map(game => {
            const isPlayer1Turn = game.turn === game.player1Id;

            return `
                <tr>
                    <td class="text-truncate" title="${game.gameId}">${truncateId(game.gameId)}</td>
                    <td class="text-truncate" title="${game.player1Id}">
                        ${truncateId(game.player1Id)}
                        ${isPlayer1Turn ? '🎯' : ''}
                    </td>
                    <td class="text-truncate" title="${game.player2Id}">
                        ${truncateId(game.player2Id)}
                        ${!isPlayer1Turn ? '🎯' : ''}
                    </td>
                    <td><span class="status-badge ${game.status}">${game.status}</span></td>
                    <td>${truncateId(game.turn)}</td>
                    <td>${formatDuration(game.duration)}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error fetching games:', error);
    }
}

// Update all data (from initial_data event)
function updateAllData(data) {
    // Update stats
    if (data.stats) {
        statTotalGames.textContent = data.stats.totalGamesPlayed;
        statPeakUsers.textContent = data.stats.peakConcurrentUsers;
    }

    // Update users
    if (data.players) {
        usersCount.textContent = data.players.length;
        statActiveUsers.textContent = data.players.length;
    }

    // Update games
    if (data.games) {
        const activeGames = data.games.filter(g => g.status !== 'finished');
        gamesCount.textContent = activeGames.length;
        statActiveGames.textContent = activeGames.length;
    }

    // Update queue
    if (data.queue) {
        statQueue.textContent = data.queue.length;
    }
}

// Add log entry
function addLogEntry(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `
        <span class="log-time">${getCurrentTime()}</span>
        <span class="log-message">${message}</span>
    `;

    eventLog.appendChild(entry);
    eventLog.scrollTop = eventLog.scrollHeight;

    // Keep only last 100 entries
    while (eventLog.children.length > 100) {
        eventLog.removeChild(eventLog.firstChild);
    }
}

// Utility Functions
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
}

function formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
}

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else {
        return `${minutes}m ${seconds % 60}s`;
    }
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

function truncateId(id) {
    if (!id) return '-';
    if (id.length <= 12) return id;
    return id.substring(0, 8) + '...';
}

// Initialize on load
console.log('Admin dashboard loaded');
