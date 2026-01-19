/**
 * Command to place ships on the player's board
 */
class PlaceShipsCommand {
    constructor(playerId, aircraftConfigs) {
        this.playerId = playerId;
        this.aircraftConfigs = aircraftConfigs; // Array of { position: {x, y}, orientation: 'horizontal'|'vertical' }
    }
}

module.exports = PlaceShipsCommand;