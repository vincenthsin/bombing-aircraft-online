const PlayerId = require('../../domain/value-objects/PlayerId');

/**
 * Handler for placing ships on a player's board
 */
class PlaceShipsCommandHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(command) {
        const playerId = PlayerId.fromString(command.playerId);
        const player = await this.playerRepository.findById(playerId);

        if (!player) {
            throw new Error(`Player ${command.playerId} not found`);
        }

        // Place the aircraft
        player.placeAircraft(command.aircraftConfigs);

        // Mark as ready if not already
        player.markAsReady();

        await this.playerRepository.save(player);

        return {
            playerId: player.playerId.value,
            success: true,
            aircraftPlaced: player.aircraft.length
        };
    }
}

module.exports = PlaceShipsCommandHandler;