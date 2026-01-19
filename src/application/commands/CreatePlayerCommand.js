/**
 * Command to create a new player
 */
class CreatePlayerCommand {
    constructor(playerId, username = null) {
        this.playerId = playerId;
        this.username = username;
    }
}

module.exports = CreatePlayerCommand;