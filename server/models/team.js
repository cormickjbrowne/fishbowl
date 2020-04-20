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

  nextPlayer(game) {
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
