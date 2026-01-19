const Player = require('../../domain/entities/Player');
const PlayerId = require('../../domain/value-objects/PlayerId');

/**
 * Handler for creating new players
 */
class CreatePlayerCommandHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(command) {
        const playerId = PlayerId.fromString(command.playerId);
        const player = new Player(playerId, command.username);

        await this.playerRepository.save(player);

        return {
            playerId: player.playerId.value,
            success: true
        };
    }
}

module.exports = CreatePlayerCommandHandler;