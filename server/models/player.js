const { generateHash } = require('../utils');

class Player {
  constructor(name, socketId) {
      this.id = generateHash();
      this.socketId = null;
      this.name = name;
      this.teamId = null;
      this.gameId = null;
      this.clueIds = [];
      this.turnIds = [];
      this.attemptIds = [];
      this.status = 'playing';
  };

  setName(name) {
    this.name = name;
  }

  joinGame(id) {
    this.gameId = id;
  }

  leaveGame(socketId) {
    if (socketId === this.socketId) {
      this.status = 'left-game';
      this.socketId = null;
    }
  }

  rejoinGame() {
    this.status = 'playing';
  }

  joinTeam(id) {
    this.teamId = id;
  }

  addClues(clues) {
    this.clueIds = clues.map(clue => clue.id);
  }

  hasClues() {
    return !!this.clueIds.length;
  }

  addTurn(turn) {
    this.turnIds.push(turn.id);
  }

  addAttempt(attempt) {
    this.attemptIds.push(attempt.id);
  }

  resetClues() {
    this.clueIds = [];
  }

  hasGoneThisRound(game) {
    const turns = this.turnIds.map(id => game.turns[id]);
    return turns.some(turn => turn.roundId === game.getCurrentRound().id);
  }

  reset() {
    this.clueIds = [];
    this.turnIds = [];
    this.attemptIds = [];
  }
}

module.exports = {
  Player
};
