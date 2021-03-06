const { generateHash, getRandom, last, nextIndex, indexById } = require('../utils');
const { Round } = require('./round');
const { Team } = require('./team');
const { Clue } = require('./clue');
const { Turn } = require('./turn');
const { Attempt } = require('./attempt');
const { Subject } = require('rxjs');

const NUM_CLUES = 4;
const NUM_TEAMS = 2;
const NUM_ROUNDS = 4;
const NUM_SECONDS_PER_TURN = 30;

class Game {
  constructor(id) {
      this.id = id || generateHash();
      this.status = 'waiting-for-players-to-join';
      this.currentAttemptId = null;
      this.currentActorId = null;
      this.currentTurnId = null;
      this.currentClueId = null;

      const rounds = ['taboo', 'charades', 'one-word'].map(type => new Round(type));
      this.roundIds = rounds.map(round => round.id);
      this.currentRoundIndex = 0;
      this.rounds = indexById(rounds);

      const teams = new Array(NUM_TEAMS).fill(1).map((_, i) => new Team(`Team ${i + 1}`));
      this.teamIds = teams.map(team => team.id);
      this.currentTeamIndex = 0;
      this.teams = indexById(teams);

      this.players = {};
      this.clues = {};
      this.turns = {};
      this.attempts = {};

      this.timeRemaining = NUM_SECONDS_PER_TURN;
      this.events = new Subject();
  }

  serialize() {
    const replacer = (key, value) => typeof value === 'function' || key === 'events' ? undefined : value;
    return JSON.stringify(this, replacer);
  }

  emitStateChange() {
    this.events.next(this.serialize());
  }

  add(type, instance) {
    this[`${type}s`][instance.id] = instance;
  }

  get(type, id) {
    return typeof id !== 'undefined' ? this[`${type}s`][id] : Object.values(this[type]);
  }

  getActor() {
    return this.get('player', this.currentActorId);
  }

  getCurrentRound() {
    return this.get('round', this.roundIds[this.currentRoundIndex]);
  }

  getCurrentTurn() {
    return this.get('turn', this.currentTurnId);
  }

  getCurrentAttempt() {
    return this.get('attempt', this.currentAttemptId);
  }

  getTeamWithLeastPlayers() {
    const teams = this.teamIds.map(id => this.teams[id]);
    let teamId;
    let numPlayers = Number.POSITIVE_INFINITY;
    for (let team of teams) {
      const numPlayersOnTeam = team.playerIds.filter(id => this.get('player', id).status === 'playing').length;
      if (numPlayersOnTeam < numPlayers) {
        numPlayers = numPlayersOnTeam;
        teamId = team.id;
      }
    }
    return this.teams[teamId];
  }

  addPlayer(player) {
    console.log('game.addPlayer()');
    if (this.players[player.id]) {
      console.log('this.players[player.id]:', this.players[player.id]);
      player.rejoinGame();
    } else {
      const team = this.getTeamWithLeastPlayers();
      console.log('team.addPlayer()');
      team.addPlayer(player);
      player.joinTeam(team.id);
      player.joinGame(this.id);
      this.players[player.id] = player;
      console.log('this.players', this.players);
    }
    this.emitStateChange();
  }

  pickTeams() {
    this.status = 'picking-teams';
    this.emitStateChange();
  }

  switchTeams(playerId) {
    const player = this.get('player', playerId);
    const currentTeam = this.get('team', player.teamId);
    const currentTeamIdIndex = this.teamIds.findIndex(teamId => teamId === currentTeam.id);
    const nextTeamIdIndex = nextIndex(this.teamIds, currentTeamIdIndex);
    const nextTeamId = this.teamIds[nextTeamIdIndex];
    const nextTeam = this.get('team', nextTeamId);
    currentTeam.removePlayer(playerId);
    nextTeam.addPlayer(player);
    player.teamId = nextTeam.id;
    this.emitStateChange();
  }

  removePlayer(player, socketId) {
    console.log('player left:', player.name);
    const team = this.teams[player.teamId];
    player.leaveGame(socketId);
    this.emitStateChange();
  }

  deletePlayer(player) {
    delete this.players[player.id];
  }

  nextPlayer() {
    const team = this.nextTeam();
    const nextPlayer = team.nextPlayer(this);
    this.currentActorId = nextPlayer.id;
    return nextPlayer;
  }

  nextTeam() {
    const nextTeamIndex = nextIndex(this.teamIds, this.currentTeamIndex);
    const nextTeamId = this.teamIds[nextTeamIndex];
    this.currentTeamIndex = nextTeamIndex;
    return this.get('team', nextTeamId);
  }

  getCluesNotGuessedThisRoundThatHaveNotBeenSkipped() {
    return this.getCluesNotGuessedThisRound().filter(clue => {
      const attempts = clue.attemptIds.map(id => this.get('attempt', id));
      const attemptsThisRound = attempts.filter(attempt => attempt.roundId === this.getCurrentRound().id);
      return !attemptsThisRound.find(attempt => attempt.status === 'skipped' && attempt.playerId === this.currentActorId);
    });
  }

  getCluesNotGuessedThisRound() {
    return this.get('clues').filter(clue => {
      const attempts = clue.attemptIds.map(id => this.get('attempt', id));
      const attemptsThisRound = attempts.filter(attempt => attempt.roundId === this.getCurrentRound().id);
      return !attemptsThisRound.find(attempt => attempt.status === 'guessed');
    });
  }

  getNextClue() {
    const currentRound = this.getCurrentRound();
    // find clues that don't have an attempt from this round with a status of guessed
    let clues = this.getCluesNotGuessedThisRoundThatHaveNotBeenSkipped();

    if (!clues.length) {
      clues = this.getCluesNotGuessedThisRound();
    }

    if (!clues.length) {
      throw new Error('All clues guessed this round.');
    }

    return getRandom(clues);
  }

  readyToPlay() {
    return this.get('players')
      .filter(player => player.status === 'playing')
      .every(player => player.hasClues());
  }

  startEnteringClues() {
    this.status = 'entering-clues';
    this.emitStateChange();
  }

  addClues(clueValues, playerId) {
    const player = this.get('player', playerId);
    const clues = clueValues.map(value => new Clue({ value, playerId: player.id, gameId: this.id }));
    clues.forEach(clue => {
      this.clues[clue.id] = clue;
    });
    player.addClues(clues);

    if (this.readyToPlay()) {
      this.status = 'ready-to-play';
    }
    this.emitStateChange();
  }

  startGame() {
    console.log('start game');
    this.status = 'ready-to-act';
    this.currentActorId = this.teams[this.teamIds[0]].firstPlayerId(this);
    this.emitStateChange();
  }

  startActing() {
    console.log('acting started');
    this.status = 'acting';
    const player = this.getActor();
    const round = this.getCurrentRound();
    const turn = new Turn({ playerId: player.id, roundId: round.id });
    this.currentTurnId = turn.id;
    player.addTurn(turn);
    round.addTurn(turn);
    this.add('turn', turn);
    this.attemptNextClue();
    this.startTimer();
    this.emitStateChange();
  }

  stopActing() {
    console.log('stop acting');
    this.stopTimer();
    this.attempts[this.currentAttemptId].timedOut();
    this.turnOver();
  }

  startTimer() {
    console.log('start timer.');
    const intervalId = setInterval(() => {
      if (this.timeRemaining <= 0) {
        this.stopActing();
      } else {
        this.timeRemaining--;
      }
      this.emitStateChange();
    }, 1000);
    this.getIntervalId = () => intervalId;
  }

  stopTimer() {
    console.log('stop timer.');
    if (typeof this.getIntervalId === 'function') {
      clearInterval(this.getIntervalId());
    }
  }

  turnOver() {
    console.log('Turn ended.');
    this.status = 'ready-to-act';
    this.timeRemaining = NUM_SECONDS_PER_TURN;
    this.nextPlayer();
    this.emitStateChange();
  }

  attemptNextClue() {
    console.log('attempting next clue');
    let clue;
    try {
      clue = this.getNextClue();
    } catch (err) {
      this.status = 'round-over';
      this.stopTimer();
      this.emitStateChange();
      return;
    }
    this.currentClueId = clue.id;
    const actor = this.getActor();
    const turn = this.get('turn', last(actor.turnIds));
    const round = this.getCurrentRound();
    const attempt = new Attempt({
      playerId: actor.id,
      teamId: actor.teamId,
      turnId: turn.id,
      roundId: round.id,
      clueId: clue.id
    });
    this.currentAttemptId = attempt.id;
    clue.addAttempt(attempt);
    turn.addAttempt(attempt);
    actor.addAttempt(attempt);
    this.add('attempt', attempt);
  }

  clueGuessed() {
    if (this.status !== 'acting') { return; }
    console.log('clue guessed');
    const attempt = this.getCurrentAttempt();
    attempt.guessed();
    this.attemptNextClue();
    this.emitStateChange();
  }

  clueSkipped() {
    if (this.status !== 'acting') { return; }
    console.log('clue skipped');
    const attempt = this.getCurrentAttempt();
    attempt.skipped();
    this.attemptNextClue();
    this.emitStateChange();
  }

  nextRound() {
    console.log('next round');
    const isLastRound = this.currentRoundIndex === this.roundIds.length - 1;
    if (isLastRound) {
      this.status = 'game-over';
      this.emitStateChange();
      return;
    }

    this.currentRoundIndex++;

    if (!this.timeRemaining) {
      this.nextPlayer();
    }

    this.status = 'ready-to-act';
    this.emitStateChange();
  }

  newGame() {
      this.status = 'picking-teams';
      this.currentAttemptId = null;
      this.currentActorId = null;
      this.currentTurnId = null;
      this.currentClueId = null;

      this.currentRoundIndex = 0;
      this.currentTeamIndex = 0;

      this.clues = {};
      this.turns = {};
      this.attempts = {};

      this.get('players').forEach(player => player.status === 'playing' ? player.reset() : this.deletePlayer(player));
      this.get('teams').forEach(team => team.reset());
      this.get('rounds').forEach(round => round.reset());
      this.emitStateChange();
  }

  denormalize() {
    return {
      name: this.id,
      players: Object.values(this.players).map(player => ({
        id: player.id,
        name: player.name,
        team: this.teams[player.teamId].name,
        status: player.status
      })),
      rounds: this.roundIds.map(roundId => {
        const round = this.rounds[roundId];
        return {
          type: round.type,
          turns: round.turnIds.map(turnId => {
            const turn = this.turns[turnId];
            return {
              player: this.players[turn.playerId].name,
              attempts: turn.attemptIds.map(attemptId => {
                const attempt = this.attempts[attemptId];
                const clue = this.clues[attempt.clueId];
                return {
                  status: attempt.status,
                  clue: {
                    value: clue.value,
                    createBy: this.players[clue.createdByPlayerId].name
                  }
                };
              })
            };
          })
        };
      })
    };
  }
}

module.exports = {
  Game
};
