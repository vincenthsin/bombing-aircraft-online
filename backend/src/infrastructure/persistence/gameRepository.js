const { runQuery, getRow, getAllRows } = require('./database');

class GameRepository {
    async createGameSession(gameId, player1Id, player2Id) {
        const result = await runQuery(
            'INSERT INTO game_sessions (game_id, player1_id, player2_id) VALUES (?, ?, ?)',
            [gameId, player1Id, player2Id]
        );
        return result.id;
    }

    async updateGameStatus(gameId, status, winnerId = null, duration = null) {
        let query = 'UPDATE game_sessions SET status = ?';
        let params = [status];

        if (winnerId !== null) {
            query += ', winner_id = ?';
            params.push(winnerId);
        }

        if (duration !== null) {
            query += ', duration_seconds = ?';
            params.push(duration);
        }

        if (status === 'finished') {
            query += ', finished_at = CURRENT_TIMESTAMP';
        } else if (status === 'playing') {
            query += ', started_at = CURRENT_TIMESTAMP';
        }

        query += ' WHERE game_id = ?';
        params.push(gameId);

        await runQuery(query, params);
    }

    async findByGameId(gameId) {
        return await getRow('SELECT * FROM game_sessions WHERE game_id = ?', [gameId]);
    }

    async recordMove(gameSessionId, playerId, moveType, x = null, y = null, result = null, moveNumber) {
        await runQuery(
            'INSERT INTO game_moves (game_session_id, player_id, move_type, x, y, result, move_number) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [gameSessionId, playerId, moveType, x, y, result, moveNumber]
        );
    }

    async updateUserStats(userId, gameResult, shots = 0, hits = 0, misses = 0, fatalHits = 0, duration = 0) {
        // First check if user stats exist
        let existingStats = await getRow('SELECT * FROM user_stats WHERE user_id = ?', [userId]);

        if (!existingStats) {
            // Create initial stats
            await runQuery(`
                INSERT INTO user_stats (user_id, games_played, games_won, games_lost, total_shots, hits, misses, fatal_hits, average_game_duration, win_rate)
                VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                gameResult === 'win' ? 1 : 0,
                gameResult === 'lose' ? 1 : 0,
                shots, hits, misses, fatalHits,
                duration,
                gameResult === 'win' ? 100 : 0
            ]);
        } else {
            // Update existing stats
            const newGamesPlayed = existingStats.games_played + 1;
            const newGamesWon = existingStats.games_won + (gameResult === 'win' ? 1 : 0);
            const newGamesLost = existingStats.games_lost + (gameResult === 'lose' ? 1 : 0);
            const newTotalShots = existingStats.total_shots + shots;
            const newHits = existingStats.hits + hits;
            const newMisses = existingStats.misses + misses;
            const newFatalHits = existingStats.fatal_hits + fatalHits;

            // Calculate new average duration
            const currentTotalDuration = existingStats.average_game_duration * existingStats.games_played;
            const newAverageDuration = (currentTotalDuration + duration) / newGamesPlayed;
            const newWinRate = newGamesPlayed > 0 ? (newGamesWon / newGamesPlayed) * 100 : 0;

            await runQuery(`
                UPDATE user_stats SET
                    games_played = ?,
                    games_won = ?,
                    games_lost = ?,
                    total_shots = ?,
                    hits = ?,
                    misses = ?,
                    fatal_hits = ?,
                    average_game_duration = ?,
                    win_rate = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `, [
                newGamesPlayed, newGamesWon, newGamesLost, newTotalShots,
                newHits, newMisses, newFatalHits, newAverageDuration, newWinRate, userId
            ]);
        }
    }

    async getGameMoves(gameId) {
        const gameSession = await this.findByGameId(gameId);
        if (!gameSession) return [];

        return await getAllRows(`
            SELECT
                gm.move_type,
                gm.x,
                gm.y,
                gm.result,
                gm.move_number,
                u.username as player_username,
                gm.created_at
            FROM game_moves gm
            JOIN users u ON gm.player_id = u.id
            WHERE gm.game_session_id = ?
            ORDER BY gm.move_number ASC
        `, [gameSession.id]);
    }

    async getGameDetails(gameId) {
        const game = await getRow(`
            SELECT
                gs.*,
                u1.username as player1_username,
                u2.username as player2_username,
                CASE
                    WHEN gs.winner_id = u1.id THEN u1.username
                    WHEN gs.winner_id = u2.id THEN u2.username
                    ELSE NULL
                END as winner_username
            FROM game_sessions gs
            JOIN users u1 ON gs.player1_id = u1.id
            JOIN users u2 ON gs.player2_id = u2.id
            WHERE gs.game_id = ?
        `, [gameId]);

        if (game) {
            game.moves = await this.getGameMoves(gameId);
        }

        return game;
    }
}

module.exports = new GameRepository();