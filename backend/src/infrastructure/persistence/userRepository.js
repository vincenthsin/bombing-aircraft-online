const { runQuery, getRow, getAllRows } = require('./database');
const bcrypt = require('bcryptjs');

// Check if using PostgreSQL
const USE_POSTGRES = process.env.DATABASE_URL || process.env.USE_POSTGRES === 'true';

// Helper function to convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertQueryForPostgres(sql, params) {
    if (!USE_POSTGRES) return { sql, params };

    let paramIndex = 1;
    const convertedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { sql: convertedSql, params };
}

class UserRepository {
    async createUser(username, email, password) {
        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const { sql, params } = convertQueryForPostgres(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );
            const result = await runQuery(sql, params);
            return result.id;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key value')) {
                throw new Error('Username or email already exists');
            }
            throw error;
        }
    }

    async findByUsername(username) {
        const { sql, params } = convertQueryForPostgres('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
        return await getRow(sql, params);
    }

    async findByEmail(email) {
        const { sql, params } = convertQueryForPostgres('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
        return await getRow(sql, params);
    }

    async findById(id) {
        const { sql, params } = convertQueryForPostgres('SELECT id, username, email, created_at, last_login FROM users WHERE id = ? AND is_active = 1', [id]);
        return await getRow(sql, params);
    }

    async verifyPassword(username, password) {
        const user = await this.findByUsername(username);
        if (!user) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return null;
        }

        return user;
    }

    async updateLastLogin(userId) {
        const { sql, params } = convertQueryForPostgres('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
        await runQuery(sql, params);
    }

    async getUserStats(userId) {
        const { sql, params } = convertQueryForPostgres(`
            SELECT
                games_played,
                games_won,
                games_lost,
                total_shots,
                hits,
                misses,
                fatal_hits,
                average_game_duration,
                win_rate
            FROM user_stats
            WHERE user_id = ?
        `, [userId]);
        const stats = await getRow(sql, params);

        if (!stats) {
            // Return default stats if no stats exist yet
            return {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesLost: 0,
                totalShots: 0,
                hits: 0,
                misses: 0,
                fatalHits: 0,
                averageGameDuration: 0,
                winRate: 0
            };
        }

        return {
            gamesPlayed: stats.games_played,
            gamesWon: stats.games_won,
            gamesLost: stats.games_lost,
            totalShots: stats.total_shots,
            hits: stats.hits,
            misses: stats.misses,
            fatalHits: stats.fatal_hits,
            averageGameDuration: stats.average_game_duration,
            winRate: stats.win_rate
        };
    }

    async getGameHistory(userId, limit = 20, offset = 0) {
        const { sql, params } = convertQueryForPostgres(`
            SELECT
                gs.game_id,
                gs.status,
                gs.winner_id,
                u1.username as player1_username,
                u2.username as player2_username,
                gs.started_at,
                gs.finished_at,
                gs.duration_seconds,
                CASE
                    WHEN gs.winner_id = ? THEN 'win'
                    WHEN gs.winner_id IS NOT NULL THEN 'lose'
                    ELSE 'ongoing'
                END as result
            FROM game_sessions gs
            JOIN users u1 ON gs.player1_id = u1.id
            JOIN users u2 ON gs.player2_id = u2.id
            WHERE (gs.player1_id = ? OR gs.player2_id = ?)
            ORDER BY gs.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, userId, userId, limit, offset]);

        const games = await getAllRows(sql, params);
        return games;
    }

    async getRecentGames(userId, limit = 10) {
        return await this.getGameHistory(userId, limit, 0);
    }
}

module.exports = new UserRepository();