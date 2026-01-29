const { getRow, getAllRows, runQuery } = require('./database');

async function getSetting(key) {
    const row = await getRow('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : null;
}

async function getAllSettings() {
    return await getAllRows('SELECT key, value, updated_at FROM settings');
}

async function updateSetting(key, value) {
    return await runQuery(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        [key, value]
    );
}

// Special version for SQLite if needed, but the above ON CONFLICT works for recent SQLite or we can use replace
async function upsertSetting(key, value) {
    // Check if we are using Postgres or SQLite
    // The runQuery in database.js handles the abstraction, but the SQL syntax might differ slightly.
    // However, SQLite 3.24+ supports ON CONFLICT.
    // If it fails, we fall back to a more compatible version.
    try {
        await runQuery(
            'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
            [key, value.toString()]
        );
    } catch (error) {
        // Fallback for older SQLite if necessary
        await runQuery('REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, value.toString()]);
    }
}

module.exports = {
    getSetting,
    getAllSettings,
    updateSetting: upsertSetting
};
