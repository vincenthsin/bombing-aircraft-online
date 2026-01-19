/**
 * Command to process a shot against a player
 */
class ProcessShotCommand {
    constructor(playerId, coordinate) {
        this.playerId = playerId;
        this.coordinate = coordinate; // {x, y}
    }
}

module.exports = ProcessShotCommand;