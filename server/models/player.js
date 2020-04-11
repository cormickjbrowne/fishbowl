class Player {
  constructor(name, id) {
      this.name = name;
      this.id = id;
      this.gameId = null;
      this.clues = [];
  };

  joinGame(id) {
    this.gameId = id;
  }

  leaveGame() {
    this.gameId = null;
  }

  addClues(clues) {
    this.clues = clues;
  }

  resetClues() {
    this.clues = [];
  }
}

module.exports = {
  Player
};
