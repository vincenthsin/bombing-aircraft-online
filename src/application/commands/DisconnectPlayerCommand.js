/**
 * Command to disconnect a player
 */
class DisconnectPlayerCommand {
    constructor(playerId) {
        this.playerId = playerId;
    }
}

module.exports = DisconnectPlayerCommand;