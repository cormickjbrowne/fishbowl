const { generateHash } = require('../utils/generate-hash');

class Round {
  constructor(type) {
    this.id = generateHash();
    this.type = type;
    this.turnIds = [];
  }

  addTurn(turn) {
    this.turnIds.push(turn.id);
  }

  reset() {
    this.turnIds = [];
  }
}

module.exports = {
  Round
};
