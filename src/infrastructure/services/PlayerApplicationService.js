const CreatePlayerCommandHandler = require('../../application/handlers/CreatePlayerCommandHandler');
const PlaceShipsCommandHandler = require('../../application/handlers/PlaceShipsCommandHandler');
const MarkPlayerReadyCommandHandler = require('../../application/handlers/MarkPlayerReadyCommandHandler');
const ProcessShotCommandHandler = require('../../application/handlers/ProcessShotCommandHandler');
const DisconnectPlayerCommandHandler = require('../../application/handlers/DisconnectPlayerCommandHandler');
const GetPlayerQueryHandler = require('../../application/handlers/GetPlayerQueryHandler');
const GetAllPlayersQueryHandler = require('../../application/handlers/GetAllPlayersQueryHandler');

const CreatePlayerCommand = require('../../application/commands/CreatePlayerCommand');
const PlaceShipsCommand = require('../../application/commands/PlaceShipsCommand');
const MarkPlayerReadyCommand = require('../../application/commands/MarkPlayerReadyCommand');
const ProcessShotCommand = require('../../application/commands/ProcessShotCommand');
const DisconnectPlayerCommand = require('../../application/commands/DisconnectPlayerCommand');
const GetPlayerQuery = require('../../application/queries/GetPlayerQuery');
const GetAllPlayersQuery = require('../../application/queries/GetAllPlayersQuery');

/**
 * Application service that handles all player-related operations
 */
class PlayerApplicationService {
    constructor(playerRepository) {
        this.commandHandlers = new Map();
        this.queryHandlers = new Map();

        // Initialize command handlers
        this.registerCommandHandler(CreatePlayerCommand.name, new CreatePlayerCommandHandler(playerRepository));
        this.registerCommandHandler(PlaceShipsCommand.name, new PlaceShipsCommandHandler(playerRepository));
        this.registerCommandHandler(MarkPlayerReadyCommand.name, new MarkPlayerReadyCommandHandler(playerRepository));
        this.registerCommandHandler(ProcessShotCommand.name, new ProcessShotCommandHandler(playerRepository));
        this.registerCommandHandler(DisconnectPlayerCommand.name, new DisconnectPlayerCommandHandler(playerRepository));

        // Initialize query handlers
        this.registerQueryHandler(GetPlayerQuery.name, new GetPlayerQueryHandler(playerRepository));
        this.registerQueryHandler(GetAllPlayersQuery.name, new GetAllPlayersQueryHandler(playerRepository));

        this.playerRepository = playerRepository;
    }

    registerCommandHandler(commandType, handler) {
        this.commandHandlers.set(commandType, handler);
    }

    registerQueryHandler(queryType, handler) {
        this.queryHandlers.set(queryType, handler);
    }

    async executeCommand(command) {
        const handler = this.commandHandlers.get(command.constructor.name);
        if (!handler) {
            throw new Error(`No handler registered for command ${command.constructor.name}`);
        }
        return await handler.handle(command);
    }

    async executeQuery(query) {
        const handler = this.queryHandlers.get(query.constructor.name);
        if (!handler) {
            throw new Error(`No handler registered for query ${query.constructor.name}`);
        }
        return await handler.handle(query);
    }

    // Convenience methods for common operations
    async createPlayer(playerId, username = null) {
        const command = new CreatePlayerCommand(playerId, username);
        return await this.executeCommand(command);
    }

    async placeShips(playerId, aircraftConfigs) {
        const command = new PlaceShipsCommand(playerId, aircraftConfigs);
        return await this.executeCommand(command);
    }

    async markPlayerReady(playerId) {
        const command = new MarkPlayerReadyCommand(playerId);
        return await this.executeCommand(command);
    }

    async processShot(playerId, coordinate) {
        const command = new ProcessShotCommand(playerId, coordinate);
        return await this.executeCommand(command);
    }

    async disconnectPlayer(playerId) {
        const command = new DisconnectPlayerCommand(playerId);
        return await this.executeCommand(command);
    }

    async getPlayer(playerId) {
        const query = new GetPlayerQuery(playerId);
        return await this.executeQuery(query);
    }

    async getAllPlayers() {
        const query = new GetAllPlayersQuery();
        return await this.executeQuery(query);
    }
}

module.exports = PlayerApplicationService;