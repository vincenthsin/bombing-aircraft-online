const DomainEvent = require('./DomainEvent');

class PlayerCreatedEvent extends DomainEvent {
    constructor(playerId) {
        super('PlayerCreated', playerId.value, {
            playerId: playerId.value
        });
    }
}

class PlayerJoinedGameEvent extends DomainEvent {
    constructor(playerId, gameId) {
        super('PlayerJoinedGame', playerId.value, {
            playerId: playerId.value,
            gameId: gameId
        });
    }
}

class PlayerPlacedShipsEvent extends DomainEvent {
    constructor(playerId, aircraft) {
        super('PlayerPlacedShips', playerId.value, {
            playerId: playerId.value,
            aircraft: aircraft.map(a => ({
                id: a.id,
                position: { x: a.position.x, y: a.position.y },
                orientation: a.orientation
            }))
        });
    }
}

class PlayerReadyEvent extends DomainEvent {
    constructor(playerId) {
        super('PlayerReady', playerId.value, {
            playerId: playerId.value
        });
    }
}

class PlayerShotEvent extends DomainEvent {
    constructor(playerId, coordinate, result) {
        super('PlayerShot', playerId.value, {
            playerId: playerId.value,
            coordinate: { x: coordinate.x, y: coordinate.y },
            result: result // 'miss', 'hit', 'fatal'
        });
    }
}

class PlayerDisconnectedEvent extends DomainEvent {
    constructor(playerId) {
        super('PlayerDisconnected', playerId.value, {
            playerId: playerId.value
        });
    }
}

module.exports = {
    PlayerCreatedEvent,
    PlayerJoinedGameEvent,
    PlayerPlacedShipsEvent,
    PlayerReadyEvent,
    PlayerShotEvent,
    PlayerDisconnectedEvent
};