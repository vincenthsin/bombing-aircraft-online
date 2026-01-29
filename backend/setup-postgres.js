const { sql } = require('@vercel/postgres');

// PostgreSQL table creation script
async function setupPostgresDatabase() {
    try {
        console.log('Setting up PostgreSQL database...');

        // Users table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN DEFAULT true
            )
        `;

        // Game sessions table
        await sql`
            CREATE TABLE IF NOT EXISTS game_sessions (
                id SERIAL PRIMARY KEY,
                game_id TEXT UNIQUE NOT NULL,
                player1_id INTEGER NOT NULL,
                player2_id INTEGER NOT NULL,
                status TEXT DEFAULT 'waiting',
                winner_id INTEGER,
                started_at TIMESTAMP WITH TIME ZONE,
                finished_at TIMESTAMP WITH TIME ZONE,
                duration_seconds INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (player1_id) REFERENCES users(id),
                FOREIGN KEY (player2_id) REFERENCES users(id),
                FOREIGN KEY (winner_id) REFERENCES users(id)
            )
        `;

        // Game moves table
        await sql`
            CREATE TABLE IF NOT EXISTS game_moves (
                id SERIAL PRIMARY KEY,
                game_session_id INTEGER NOT NULL,
                player_id INTEGER NOT NULL,
                move_type TEXT NOT NULL,
                x INTEGER,
                y INTEGER,
                result TEXT,
                move_number INTEGER NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (game_session_id) REFERENCES game_sessions(id),
                FOREIGN KEY (player_id) REFERENCES users(id)
            )
        `;

        // User statistics table
        await sql`
            CREATE TABLE IF NOT EXISTS user_stats (
                id SERIAL PRIMARY KEY,
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
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;

        // System settings table
        await sql`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Insert default matchmaking_timeout if it doesn't exist
        await sql`
            INSERT INTO settings (key, value)
            VALUES ('matchmaking_timeout', '3000')
            ON CONFLICT (key) DO NOTHING
        `;

        console.log('PostgreSQL database tables created successfully!');
    } catch (error) {
        console.error('Error setting up PostgreSQL database:', error);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupPostgresDatabase().then(() => {
        console.log('Database setup complete.');
        process.exit(0);
    });
}

module.exports = { setupPostgresDatabase };