/**
 * Command to mark a player as ready
 */
class MarkPlayerReadyCommand {
    constructor(playerId) {
        this.playerId = playerId;
    }
}

module.exports = MarkPlayerReadyCommand;