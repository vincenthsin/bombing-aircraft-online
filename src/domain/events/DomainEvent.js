/**
 * Base class for all domain events
 */
class DomainEvent {
    constructor(eventType, aggregateId, eventData = {}, timestamp = null) {
        this._eventType = eventType;
        this._aggregateId = aggregateId;
        this._eventData = { ...eventData };
        this._timestamp = timestamp || new Date();
        this._eventId = require('crypto').randomUUID();
        Object.freeze(this._eventData);
        Object.freeze(this);
    }

    get eventType() {
        return this._eventType;
    }

    get aggregateId() {
        return this._aggregateId;
    }

    get eventData() {
        return { ...this._eventData };
    }

    get timestamp() {
        return this._timestamp;
    }

    get eventId() {
        return this._eventId;
    }

    toString() {
        return `${this._eventType} [${this._aggregateId}] at ${this._timestamp.toISOString()}`;
    }
}

module.exports = DomainEvent;