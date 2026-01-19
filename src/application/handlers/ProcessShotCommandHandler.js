const PlayerId = require('../../domain/value-objects/PlayerId');
const Coordinate = require('../../domain/value-objects/Coordinate');

/**
 * Handler for processing shots against players
 */
class ProcessShotCommandHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(command) {
        const playerId = PlayerId.fromString(command.playerId);
        const player = await this.playerRepository.findById(playerId);

        if (!player) {
            throw new Error(`Player ${command.playerId} not found`);
        }

        const coordinate = Coordinate.fromObject(command.coordinate);
        const shotResult = player.processShot(coordinate);

        await this.playerRepository.save(player);

        return {
            playerId: player.playerId.value,
            coordinate: { x: coordinate.x, y: coordinate.y },
            result: shotResult.result,
            hitAircraft: shotResult.hitAircraft,
            isHeadHit: shotResult.isHeadHit,
            aircraftDestroyed: shotResult.aircraftDestroyed,
            playerLost: player.hasLost(),
            gameStats: player.getGameStats()
        };
    }
}

module.exports = ProcessShotCommandHandler;