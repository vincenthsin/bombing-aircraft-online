const PlayerId = require('../value-objects/PlayerId');
const Aircraft = require('../value-objects/Aircraft');
const GameBoard = require('../value-objects/GameBoard');
const Coordinate = require('../value-objects/Coordinate');
const {
    PlayerCreatedEvent,
    PlayerJoinedGameEvent,
    PlayerPlacedShipsEvent,
    PlayerReadyEvent,
    PlayerShotEvent,
    PlayerDisconnectedEvent
} = require('../events/PlayerEvents');

/**
 * Domain Entity representing a Player in the bombing aircraft game
 */
class Player {
    constructor(playerId, username = null) {
        if (!(playerId instanceof PlayerId)) {
            throw new Error('playerId must be a PlayerId instance');
        }

        this._playerId = playerId;
        this._username = username;
        this._gameBoard = GameBoard.createEmpty();
        this._aircraft = []; // Array of Aircraft
        this._ready = false;
        this._connectedAt = new Date();
        this._lastActivity = new Date();
        this._domainEvents = [];

        // Raise domain event
        this.addDomainEvent(new PlayerCreatedEvent(playerId));
    }

    get playerId() {
        return this._playerId;
    }

    get username() {
        return this._username;
    }

    get gameBoard() {
        return this._gameBoard;
    }

    get aircraft() {
        return [...this._aircraft];
    }

    get ready() {
        return this._ready;
    }

    get connectedAt() {
        return this._connectedAt;
    }

    get lastActivity() {
        return this._lastActivity;
    }

    get domainEvents() {
        return [...this._domainEvents];
    }

    /**
     * Clear domain events after they've been handled
     */
    clearDomainEvents() {
        this._domainEvents = [];
    }

    /**
     * Add a domain event
     */
    addDomainEvent(event) {
        this._domainEvents.push(event);
        this._lastActivity = new Date();
    }

    /**
     * Place aircraft on the board
     */
    placeAircraft(aircraftConfigs) {
        if (this._ready) {
            throw new Error('Cannot place ships after player is ready');
        }

        if (aircraftConfigs.length !== 3) {
            throw new Error('Player must place exactly 3 aircraft');
        }

        // Validate and create aircraft
        const newAircraft = [];
        const occupiedCoordinates = [];

        for (let i = 0; i < aircraftConfigs.length; i++) {
            const config = aircraftConfigs[i];
            if (!config || !config.position) {
                throw new Error(`Invalid aircraft config at index ${i}: ${JSON.stringify(config)}`);
            }
            const aircraftId = `aircraft-${i + 1}`;
            const position = Coordinate.fromObject(config.position);
            const orientation = config.orientation || 'horizontal';

            // Check if aircraft can be placed
            if (!Aircraft.canPlaceAt(position, orientation, occupiedCoordinates)) {
                throw new Error(`Cannot place aircraft ${aircraftId} at position ${position} (${orientation}): invalid position or overlap`);
            }

            const aircraft = new Aircraft(aircraftId, position, orientation);
            newAircraft.push(aircraft);

            // Add all aircraft coordinates to occupied list
            aircraft.parts.forEach(part => {
                occupiedCoordinates.push(part.coordinate);
            });
        }

        // Update player state
        this._aircraft = newAircraft;

        // Update game board with ship placements
        let updatedBoard = this._gameBoard;
        this._aircraft.forEach(aircraft => {
            const coordinates = aircraft.parts.map(part => part.coordinate);
            updatedBoard = updatedBoard.placeShip(coordinates);
        });
        this._gameBoard = updatedBoard;

        // Raise domain event
        this.addDomainEvent(new PlayerPlacedShipsEvent(this._playerId, this._aircraft));
    }

    /**
     * Mark player as ready to start the game
     */
    markAsReady() {
        if (!this._ready && this._aircraft.length === 3) {
            this._ready = true;
            this.addDomainEvent(new PlayerReadyEvent(this._playerId));
        }
    }

    /**
     * Process a shot from the opponent
     */
    processShot(coordinate) {
        if (!(coordinate instanceof Coordinate)) {
            coordinate = Coordinate.fromObject(coordinate);
        }

        // Find which aircraft was hit
        let hitAircraft = null;
        let hitPart = null;
        let isHeadHit = false;

        for (const aircraft of this._aircraft) {
            if (!aircraft.destroyed) {
                hitPart = aircraft.getPartAt(coordinate);
                if (hitPart) {
                    hitAircraft = aircraft;
                    isHeadHit = hitPart.isHead();
                    break;
                }
            }
        }

        let result = 'miss';
        let updatedAircraft = [...this._aircraft];
        let updatedBoard = this._gameBoard;

        if (hitAircraft) {
            if (isHeadHit) {
                // Fatal hit - destroy entire aircraft instantly
                result = 'fatal';
                updatedBoard = updatedBoard.shoot(coordinate, true, true);
                updatedAircraft = updatedAircraft.map(a =>
                    a.id === hitAircraft.id ? a.destroy() : a
                );
            } else {
                // Normal hit
                result = 'hit';
                updatedBoard = updatedBoard.shoot(coordinate, true, false);

                // Check if aircraft is now fully destroyed
                const aircraftParts = hitAircraft.parts.filter(part =>
                    !part.part.isHead() // Exclude head since it's not hit yet
                );
                const allPartsHit = aircraftParts.every(part => {
                    const cellState = updatedBoard.getCellState(part.coordinate);
                    return cellState === GameBoard.HIT || cellState === GameBoard.FATAL;
                });

                if (allPartsHit) {
                    // Mark aircraft as destroyed
                    updatedAircraft = updatedAircraft.map(a =>
                        a.id === hitAircraft.id ? a.destroy() : a
                    );
                }
            }
        } else {
            // Miss
            updatedBoard = updatedBoard.shoot(coordinate, false, false);
        }

        // Update player state
        this._gameBoard = updatedBoard;
        this._aircraft = updatedAircraft;

        return {
            result,
            hitAircraft: hitAircraft ? hitAircraft.id : null,
            isHeadHit,
            aircraftDestroyed: hitAircraft && isHeadHit
        };
    }

    /**
     * Check if player has lost (all aircraft destroyed)
     */
    hasLost() {
        return this._aircraft.every(aircraft => aircraft.destroyed);
    }

    /**
     * Get player's current game statistics
     */
    getGameStats() {
        const totalShots = this._gameBoard.grid.flat().filter(cell =>
            cell === GameBoard.HIT || cell === GameBoard.MISS || cell === GameBoard.FATAL
        ).length;

        const hits = this._gameBoard.grid.flat().filter(cell =>
            cell === GameBoard.HIT || cell === GameBoard.FATAL
        ).length;

        const fatalHits = this._gameBoard.grid.flat().filter(cell =>
            cell === GameBoard.FATAL
        ).length;

        const destroyedAircraft = this._aircraft.filter(a => a.destroyed).length;

        return {
            totalShots,
            hits,
            fatalHits,
            destroyedAircraft,
            accuracy: totalShots > 0 ? (hits / totalShots * 100).toFixed(1) : 0
        };
    }

    /**
     * Mark player as disconnected
     */
    disconnect() {
        this.addDomainEvent(new PlayerDisconnectedEvent(this._playerId));
    }

    /**
     * Create Player from existing data (for reconstruction)
     */
    static fromData(data) {
        const player = Object.create(Player.prototype);

        player._playerId = PlayerId.fromString(data.playerId);
        player._username = data.username;
        player._gameBoard = GameBoard.fromGrid(data.gameBoard);
        player._aircraft = data.aircraft.map(a => new Aircraft(a.id, Coordinate.fromObject(a.position), a.orientation));
        player._ready = data.ready;
        player._connectedAt = new Date(data.connectedAt);
        player._lastActivity = new Date(data.lastActivity);
        player._domainEvents = [];

        return player;
    }

    /**
     * Get serializable representation of the player
     */
    toData() {
        return {
            playerId: this._playerId.value,
            username: this._username,
            gameBoard: this._gameBoard.grid,
            aircraft: this._aircraft.map(a => ({
                id: a.id,
                position: { x: a.position.x, y: a.position.y },
                orientation: a.orientation,
                destroyed: a.destroyed
            })),
            ready: this._ready,
            connectedAt: this._connectedAt.toISOString(),
            lastActivity: this._lastActivity.toISOString()
        };
    }

    equals(other) {
        if (!(other instanceof Player)) {
            return false;
        }
        return this._playerId.equals(other._playerId);
    }

    toString() {
        return `Player ${this._playerId.value}${this._username ? ` (${this._username})` : ''}`;
    }
}

module.exports = Player;