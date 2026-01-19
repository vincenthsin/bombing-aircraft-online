// Domain layer exports
const Player = require('./entities/Player');
const Coordinate = require('./value-objects/Coordinate');
const ShipPart = require('./value-objects/ShipPart');
const Aircraft = require('./value-objects/Aircraft');
const GameBoard = require('./value-objects/GameBoard');
const PlayerId = require('./value-objects/PlayerId');
const DomainEvent = require('./events/DomainEvent');
const {
    PlayerCreatedEvent,
    PlayerJoinedGameEvent,
    PlayerPlacedShipsEvent,
    PlayerReadyEvent,
    PlayerShotEvent,
    PlayerDisconnectedEvent
} = require('./events/PlayerEvents');

module.exports = {
    Player,
    Coordinate,
    ShipPart,
    Aircraft,
    GameBoard,
    PlayerId,
    DomainEvent,
    PlayerEvents: {
        PlayerCreatedEvent,
        PlayerJoinedGameEvent,
        PlayerPlacedShipsEvent,
        PlayerReadyEvent,
        PlayerShotEvent,
        PlayerDisconnectedEvent
    }
};