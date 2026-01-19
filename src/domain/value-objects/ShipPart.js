/**
 * Value Object representing different parts of an aircraft
 */
class ShipPart {
    static HEAD = new ShipPart('HEAD');
    static WING = new ShipPart('WING');
    static BODY = new ShipPart('BODY');
    static TAIL = new ShipPart('TAIL');

    constructor(type) {
        if (!['HEAD', 'WING', 'BODY', 'TAIL'].includes(type)) {
            throw new Error(`Invalid ship part type: ${type}`);
        }
        this._type = type;
        Object.freeze(this);
    }

    get type() {
        return this._type;
    }

    isHead() {
        return this._type === 'HEAD';
    }

    isCritical() {
        return this.isHead(); // Currently only head is critical
    }

    equals(other) {
        if (!(other instanceof ShipPart)) {
            return false;
        }
        return this._type === other._type;
    }

    toString() {
        return this._type;
    }
}

module.exports = ShipPart;