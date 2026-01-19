/**
 * Repository interface for Player entities
 */
class PlayerRepository {
    /**
     * Find a player by ID
     * @param {PlayerId} playerId
     * @returns {Promise<Player|null>}
     */
    async findById(playerId) {
        throw new Error('Method findById must be implemented');
    }

    /**
     * Save a player
     * @param {Player} player
     * @returns {Promise<void>}
     */
    async save(player) {
        throw new Error('Method save must be implemented');
    }

    /**
     * Find all players
     * @returns {Promise<Player[]>}
     */
    async findAll() {
        throw new Error('Method findAll must be implemented');
    }

    /**
     * Delete a player
     * @param {PlayerId} playerId
     * @returns {Promise<boolean>}
     */
    async delete(playerId) {
        throw new Error('Method delete must be implemented');
    }

    /**
     * Check if a player exists
     * @param {PlayerId} playerId
     * @returns {Promise<boolean>}
     */
    async exists(playerId) {
        throw new Error('Method exists must be implemented');
    }
}

module.exports = PlayerRepository;