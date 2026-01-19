const PlayerRepository = require('./PlayerRepository');
const Player = require('../../domain/entities/Player');

/**
 * In-memory implementation of PlayerRepository
 */
class InMemoryPlayerRepository extends PlayerRepository {
    constructor() {
        super();
        this.players = new Map(); // playerId.value -> Player
    }

    async findById(playerId) {
        const player = this.players.get(playerId.value);
        return player || null;
    }

    async save(player) {
        this.players.set(player.playerId.value, player);
    }

    async findAll() {
        return Array.from(this.players.values());
    }

    async delete(playerId) {
        return this.players.delete(playerId.value);
    }

    async exists(playerId) {
        return this.players.has(playerId.value);
    }

    /**
     * Get player data for serialization (used by existing server.js)
     */
    getPlayerData(playerId) {
        const player = this.players.get(playerId);
        return player ? player.toData() : null;
    }

    /**
     * Get all player data for serialization
     */
    getAllPlayerData() {
        const result = {};
        for (const [id, player] of this.players) {
            result[id] = player.toData();
        }
        return result;
    }

    /**
     * Load players from serialized data (for migration)
     */
    loadFromData(playerData) {
        this.players.clear();
        for (const [id, data] of Object.entries(playerData)) {
            const player = Player.fromData(data);
            this.players.set(id, player);
        }
    }

    /**
     * Clear all players
     */
    clear() {
        this.players.clear();
    }
}

module.exports = InMemoryPlayerRepository;