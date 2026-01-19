const Coordinate = require('./Coordinate');
const ShipPart = require('./ShipPart');

/**
 * Value Object representing an aircraft with its position and parts
 */
class Aircraft {
    constructor(id, position, orientation = 'horizontal') {
        this._id = id;
        this._position = position; // Coordinate of the head
        this._orientation = orientation;
        this._parts = this.buildAircraftParts();
        this._destroyed = false;
        Object.freeze(this);
    }

    get id() {
        return this._id;
    }

    get position() {
        return this._position;
    }

    get orientation() {
        return this._orientation;
    }

    get parts() {
        return [...this._parts];
    }

    get destroyed() {
        return this._destroyed;
    }

    /**
     * Build the aircraft parts based on the classic "Bombing Aircraft" shape
     * The shape is:
     *   H        (Head)
     * WWBWW      (Wings/Body)
     *   B        (Body)
     *  TTT       (Tail)
     */
    buildAircraftParts() {
        const parts = [];
        const x = this._position.x;
        const y = this._position.y;

        if (this._orientation === 'horizontal') {
            // Head at position
            parts.push({ coordinate: new Coordinate(x, y), part: ShipPart.HEAD });

            // Wings and body (row below head)
            parts.push({ coordinate: new Coordinate(x-2, y+1), part: ShipPart.WING });
            parts.push({ coordinate: new Coordinate(x-1, y+1), part: ShipPart.WING });
            parts.push({ coordinate: new Coordinate(x, y+1), part: ShipPart.BODY });
            parts.push({ coordinate: new Coordinate(x+1, y+1), part: ShipPart.WING });
            parts.push({ coordinate: new Coordinate(x+2, y+1), part: ShipPart.WING });

            // Body (two rows below head)
            parts.push({ coordinate: new Coordinate(x, y+2), part: ShipPart.BODY });

            // Tail (three rows below head)
            parts.push({ coordinate: new Coordinate(x-1, y+3), part: ShipPart.TAIL });
            parts.push({ coordinate: new Coordinate(x, y+3), part: ShipPart.TAIL });
            parts.push({ coordinate: new Coordinate(x+1, y+3), part: ShipPart.TAIL });
        } else { // vertical orientation
            // Head at position
            parts.push({ coordinate: new Coordinate(x, y), part: ShipPart.HEAD });

            // Wings and body (column to the right of head)
            parts.push({ coordinate: new Coordinate(x+1, y-2), part: ShipPart.WING });
            parts.push({ coordinate: new Coordinate(x+1, y-1), part: ShipPart.WING });
            parts.push({ coordinate: new Coordinate(x+1, y), part: ShipPart.BODY });
            parts.push({ coordinate: new Coordinate(x+1, y+1), part: ShipPart.WING });
            parts.push({ coordinate: new Coordinate(x+1, y+2), part: ShipPart.WING });

            // Body (two columns to the right of head)
            parts.push({ coordinate: new Coordinate(x+2, y), part: ShipPart.BODY });

            // Tail (three columns to the right of head)
            parts.push({ coordinate: new Coordinate(x+3, y-1), part: ShipPart.TAIL });
            parts.push({ coordinate: new Coordinate(x+3, y), part: ShipPart.TAIL });
            parts.push({ coordinate: new Coordinate(x+3, y+1), part: ShipPart.TAIL });
        }

        return parts;
    }

    /**
     * Check if this aircraft occupies a specific coordinate
     */
    occupiesCoordinate(coordinate) {
        return this._parts.some(part =>
            part.coordinate.equals(coordinate)
        );
    }

    /**
     * Get the part at a specific coordinate
     */
    getPartAt(coordinate) {
        const part = this._parts.find(p =>
            p.coordinate.equals(coordinate)
        );
        return part ? part.part : null;
    }

    /**
     * Check if the aircraft can be placed at the given position
     */
    static canPlaceAt(position, orientation, existingCoordinates = []) {
        try {
            const tempAircraft = new Aircraft('temp', position, orientation);
            // Check if all parts are within bounds
            for (const part of tempAircraft._parts) {
                const coord = part.coordinate;
                if (coord.x < 0 || coord.x >= 10 || coord.y < 0 || coord.y >= 10) {
                    return false;
                }
                // Check if coordinate is already occupied
                if (existingCoordinates.some(existing =>
                    existing.equals(coord)
                )) {
                    return false;
                }
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Mark aircraft as destroyed
     */
    destroy() {
        const destroyedAircraft = Object.create(Object.getPrototypeOf(this));
        destroyedAircraft._id = this._id;
        destroyedAircraft._position = this._position;
        destroyedAircraft._orientation = this._orientation;
        destroyedAircraft._parts = this._parts;
        destroyedAircraft._destroyed = true;
        Object.freeze(destroyedAircraft);
        return destroyedAircraft;
    }

    equals(other) {
        if (!(other instanceof Aircraft)) {
            return false;
        }
        return this._id === other._id &&
               this._position.equals(other._position) &&
               this._orientation === other._orientation;
    }

    toString() {
        return `Aircraft ${this._id} at ${this._position} (${this._orientation})`;
    }
}

module.exports = Aircraft;