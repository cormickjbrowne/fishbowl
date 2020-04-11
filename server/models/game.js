const { generateHash } = require('../utils/generate-hash');

class Game {
  constructor(id) {
      this.id = id || generateHash();
      this.status = 'waiting';
      this.playerIds = [];
      this.clues = [];
  }

  setStatus(status) {
    this.status = status;
  }

  addPlayer(id) {
    this.playerIds.push(id);
  }

  removePlayer(id) {
    const index = this.playerIds.findIndex(playerId => playerId === id);
    this.playerIds.splice(index, 1);
  }

  addClues(clues) {
    this.clues = clues;
  }

  resetClues() {
    this.clues = [];
  }
}

module.exports = {
  Game
};
