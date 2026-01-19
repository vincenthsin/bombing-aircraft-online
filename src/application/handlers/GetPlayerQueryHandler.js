const PlayerId = require('../../domain/value-objects/PlayerId');

/**
 * Handler for getting a player by ID
 */
class GetPlayerQueryHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(query) {
        const playerId = PlayerId.fromString(query.playerId);
        const player = await this.playerRepository.findById(playerId);

        if (!player) {
            return null;
        }

        return player.toData();
    }
}

module.exports = GetPlayerQueryHandler;