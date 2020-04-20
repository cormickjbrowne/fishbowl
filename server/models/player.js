const NUM_CLUES = 5;

class Player {
  constructor(id) {
      this.id = id;
      this.name = null;
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

  leaveGame() {
    this.status = 'left-game';
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
