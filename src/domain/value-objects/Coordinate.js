/**
 * Value Object representing a coordinate on the game board
 */
class Coordinate {
    constructor(x, y) {
        this.validateCoordinate(x, y);
        this._x = x;
        this._y = y;
        Object.freeze(this);
    }

    get x() {
        return this._x;
    }

    get y() {
        return this._y;
    }

    validateCoordinate(x, y) {
        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new Error('Coordinates must be integers');
        }
        if (x < 0 || x >= 10 || y < 0 || y >= 10) {
            throw new Error('Coordinates must be within board bounds (0-9)');
        }
    }

    equals(other) {
        if (!(other instanceof Coordinate)) {
            return false;
        }
        return this._x === other._x && this._y === other._y;
    }

    toString() {
        return `(${this._x},${this._y})`;
    }

    /**
     * Create Coordinate from object with x,y properties
     */
    static fromObject(obj) {
        if (!obj) {
            throw new Error('Coordinate.fromObject: obj is null or undefined');
        }
        if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
            throw new Error(`Coordinate.fromObject: invalid x,y values: x=${obj.x}, y=${obj.y}`);
        }
        return new Coordinate(obj.x, obj.y);
    }

    /**
     * Get all coordinates in a rectangle from (x1,y1) to (x2,y2)
     */
    static getCoordinatesInRange(x1, y1, x2, y2) {
        const coordinates = [];
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
                coordinates.push(new Coordinate(x, y));
            }
        }
        return coordinates;
    }
}

module.exports = Coordinate;