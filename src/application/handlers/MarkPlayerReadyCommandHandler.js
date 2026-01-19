const PlayerId = require('../../domain/value-objects/PlayerId');

/**
 * Handler for marking players as ready
 */
class MarkPlayerReadyCommandHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(command) {
        const playerId = PlayerId.fromString(command.playerId);
        const player = await this.playerRepository.findById(playerId);

        if (!player) {
            throw new Error(`Player ${command.playerId} not found`);
        }

        player.markAsReady();
        await this.playerRepository.save(player);

        return {
            playerId: player.playerId.value,
            ready: player.ready,
            success: true
        };
    }
}

module.exports = MarkPlayerReadyCommandHandler;