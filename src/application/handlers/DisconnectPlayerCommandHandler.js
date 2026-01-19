const PlayerId = require('../../domain/value-objects/PlayerId');

/**
 * Handler for disconnecting players
 */
class DisconnectPlayerCommandHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(command) {
        const playerId = PlayerId.fromString(command.playerId);
        const player = await this.playerRepository.findById(playerId);

        if (player) {
            player.disconnect();
            await this.playerRepository.save(player);
        }

        // Even if player not found, we consider disconnect successful
        return {
            playerId: command.playerId,
            success: true
        };
    }
}

module.exports = DisconnectPlayerCommandHandler;