const { nextIndex, generateHash } = require('../utils');

class Team {
  constructor(name) {
    this.id = generateHash();
    this.name = name;
    this.playerIds = [];
    this.currentPlayerIndex = 0;
  }

  addPlayer(player) {
    this.playerIds.push(player.id);
  }

  removePlayer(id) {
    const index = this.playerIds.findIndex(playerId => playerId === id);
    if (index >= 0) {
      this.playerIds.splice(index, 1);
    }
  }

  firstPlayerId(game) {
    for (let i = 0; i < this.playerIds.length; i++) {
      const playerId = this.playerIds[this.currentPlayerIndex];
      const player = game.get('player', playerId);

      if (player && player.status === 'playing') { return playerId; }

      this.currentPlayerIndex = nextIndex(this.playerIds, this.currentPlayerIndex);
    }

    return null;
  }

  nextPlayer(game) {
    const playerIds = this.playerIds.filter(id => game.players[id].status === 'playing');
    const index = nextIndex(this.playerIds, this.currentPlayerIndex);
    const id = this.playerIds[index];
    this.currentPlayerIndex = index;
    return game.get('player', id);
  }

  reset() {
    this.currentPlayerIndex = 0;
  }
}

module.exports = {
  Team
};
