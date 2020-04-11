export class Room {
  constructor() {
    this.players = [];
    this.games = [];
  }
  addPlayer(player) {
    this.players.push(player);
  }
  addPlayers(players) {
    for (const player of players) {
      this.addPlayer(player);
    }
  }

  createGame(game) {
    this.games.push(game);
  }
}
