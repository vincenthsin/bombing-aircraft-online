const { runQuery, getRow, getAllRows } = require('./database');
const bcrypt = require('bcryptjs');

class UserRepository {
    async createUser(username, email, password) {
        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const result = await runQuery(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );
            return result.id;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                throw new Error('Username or email already exists');
            }
            throw error;
        }
    }

    async findByUsername(username) {
        return await getRow('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    }

    async findByEmail(email) {
        return await getRow('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    }

    async findById(id) {
        return await getRow('SELECT id, username, email, created_at, last_login FROM users WHERE id = ? AND is_active = 1', [id]);
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
        await runQuery('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
    }

    async getUserStats(userId) {
        const stats = await getRow(`
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
        const games = await getAllRows(`
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

        return games;
    }

    async getRecentGames(userId, limit = 10) {
        return await this.getGameHistory(userId, limit, 0);
    }
}

module.exports = new UserRepository();