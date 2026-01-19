/**
 * Value Object representing a unique player identifier
 */
class PlayerId {
    constructor(value) {
        if (!value || typeof value !== 'string') {
            throw new Error('PlayerId must be a non-empty string');
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() {
        return this._value;
    }

    equals(other) {
        if (!(other instanceof PlayerId)) {
            return false;
        }
        return this._value === other._value;
    }

    toString() {
        return this._value;
    }

    /**
     * Create PlayerId from string
     */
    static fromString(str) {
        return new PlayerId(str);
    }

    /**
     * Generate a new unique PlayerId
     */
    static generate() {
        return new PlayerId(require('crypto').randomUUID());
    }
}

module.exports = PlayerId;