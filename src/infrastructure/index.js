// Infrastructure layer exports
const PlayerRepository = require('./repositories/PlayerRepository');
const InMemoryPlayerRepository = require('./repositories/InMemoryPlayerRepository');
const PlayerApplicationService = require('./services/PlayerApplicationService');

module.exports = {
    Repositories: {
        PlayerRepository,
        InMemoryPlayerRepository
    },
    Services: {
        PlayerApplicationService
    }
};