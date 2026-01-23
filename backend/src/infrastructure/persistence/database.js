// Database adapter that works with both SQLite (local) and PostgreSQL (production)
const path = require('path');
const USE_POSTGRES = process.env.DATABASE_URL || process.env.USE_POSTGRES === 'true';

let db, runQuery, getRow, getAllRows;

if (USE_POSTGRES) {
    // PostgreSQL for production (Vercel)
    const { sql } = require('@vercel/postgres');

    // PostgreSQL compatible queries
    runQuery = async (query, params = []) => {
        try {
            const result = await sql.query(query, params);
            return { id: result.insertId || result.rows[0]?.id, changes: result.rowCount };
        } catch (error) {
            throw error;
        }
    };

    getRow = async (query, params = []) => {
        try {
            const result = await sql.query(query, params);
            return result.rows[0] || null;
        } catch (error) {
            throw error;
        }
    };

    getAllRows = async (query, params = []) => {
        try {
            const result = await sql.query(query, params);
            return result.rows;
        } catch (error) {
            throw error;
        }
    };

    db = sql; // For compatibility

    console.log('Using PostgreSQL database for production.');
} else {
    // SQLite for local development
    const sqlite3 = require('sqlite3').verbose();

    // Allow configuring DB location for separate backend deployments
    // Default: database.sqlite in backend working directory
    const DB_PATH = process.env.DB_PATH
        ? path.resolve(process.env.DB_PATH)
        : path.join(process.cwd(), 'database.sqlite');

    // Create database connection
    const sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
        } else {
            console.log('Connected to the SQLite database.');
            initializeDatabase();
        }
    });

    // SQLite specific functions
    runQuery = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            sqliteDb.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    };

    getRow = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            sqliteDb.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    };

    getAllRows = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            sqliteDb.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    };

    db = sqliteDb;
}

// Initialize database tables (SQLite only)
function initializeDatabase() {
    if (!USE_POSTGRES) {
        // Users table
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT 1
            )
        `);

        // Game sessions table
        db.run(`
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id TEXT UNIQUE NOT NULL,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER NOT NULL,
                status TEXT DEFAULT 'waiting', -- waiting, placing, playing, finished
                winner_id INTEGER,
                started_at DATETIME,
                finished_at DATETIME,
                duration_seconds INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player1_id) REFERENCES users(id),
                FOREIGN KEY (player2_id) REFERENCES users(id),
                FOREIGN KEY (winner_id) REFERENCES users(id)
            )
        `);

        // Game moves table (for detailed history)
        db.run(`
            CREATE TABLE IF NOT EXISTS game_moves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_session_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                move_type TEXT NOT NULL, -- 'shoot', 'place_ships'
                x INTEGER,
                y INTEGER,
                result TEXT, -- 'hit', 'miss', 'fatal'
                move_number INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
                FOREIGN KEY (player_id) REFERENCES users(id)
            )
        `);

        // User statistics table
        db.run(`
            CREATE TABLE IF NOT EXISTS user_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                games_played INTEGER DEFAULT 0,
                games_won INTEGER DEFAULT 0,
                games_lost INTEGER DEFAULT 0,
                total_shots INTEGER DEFAULT 0,
                hits INTEGER DEFAULT 0,
                misses INTEGER DEFAULT 0,
                fatal_hits INTEGER DEFAULT 0,
                average_game_duration REAL DEFAULT 0,
                win_rate REAL DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        console.log('Database tables initialized.');
    }
}

module.exports = {
    db,
    runQuery,
    getRow,
    getAllRows
};