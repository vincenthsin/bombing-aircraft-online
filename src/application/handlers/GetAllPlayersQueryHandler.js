/**
 * Handler for getting all players
 */
class GetAllPlayersQueryHandler {
    constructor(playerRepository) {
        this.playerRepository = playerRepository;
    }

    async handle(query) {
        const players = await this.playerRepository.findAll();
        return players.map(player => player.toData());
    }
}

module.exports = GetAllPlayersQueryHandler;