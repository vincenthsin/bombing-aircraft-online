// Application layer exports
const CreatePlayerCommand = require('./commands/CreatePlayerCommand');
const PlaceShipsCommand = require('./commands/PlaceShipsCommand');
const MarkPlayerReadyCommand = require('./commands/MarkPlayerReadyCommand');
const ProcessShotCommand = require('./commands/ProcessShotCommand');
const DisconnectPlayerCommand = require('./commands/DisconnectPlayerCommand');

const GetPlayerQuery = require('./queries/GetPlayerQuery');
const GetAllPlayersQuery = require('./queries/GetAllPlayersQuery');

const CreatePlayerCommandHandler = require('./handlers/CreatePlayerCommandHandler');
const PlaceShipsCommandHandler = require('./handlers/PlaceShipsCommandHandler');
const MarkPlayerReadyCommandHandler = require('./handlers/MarkPlayerReadyCommandHandler');
const ProcessShotCommandHandler = require('./handlers/ProcessShotCommandHandler');
const DisconnectPlayerCommandHandler = require('./handlers/DisconnectPlayerCommandHandler');
const GetPlayerQueryHandler = require('./handlers/GetPlayerQueryHandler');
const GetAllPlayersQueryHandler = require('./handlers/GetAllPlayersQueryHandler');

module.exports = {
    Commands: {
        CreatePlayerCommand,
        PlaceShipsCommand,
        MarkPlayerReadyCommand,
        ProcessShotCommand,
        DisconnectPlayerCommand
    },
    Queries: {
        GetPlayerQuery,
        GetAllPlayersQuery
    },
    Handlers: {
        CreatePlayerCommandHandler,
        PlaceShipsCommandHandler,
        MarkPlayerReadyCommandHandler,
        ProcessShotCommandHandler,
        DisconnectPlayerCommandHandler,
        GetPlayerQueryHandler,
        GetAllPlayersQueryHandler
    }
};