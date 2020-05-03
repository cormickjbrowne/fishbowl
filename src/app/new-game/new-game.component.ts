import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { Game } from '../models/game.interface';
import { State } from '../models/state.interface';
import { Player } from '../models/player.interface';
import { GameService } from '../game.service';

const numClues = 4;
const getEmptyClues = () => new Array(numClues).fill(1).map(() => ({ value: null }));

@Component({
  selector: 'app-new-game',
  templateUrl: './new-game.component.html',
  styleUrls: ['./new-game.component.scss']
})
export class NewGameComponent implements OnInit, OnDestroy {

  public game: Game;
  public currentPlayerId: string;
  public socket: any;
  public playerName: string;
  public players: Player[] = [];
  public clue: string;
  public clues: { value: string }[] = getEmptyClues();
  public actingPlayer: Player;
  public timeLeft: number;
  public numClues = numClues;
  public debug = false;

  constructor(private gameService: GameService, private route: ActivatedRoute) {
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  ngOnInit() {
    this.route.queryParams.subscribe((queryParams) => {
      this.debug = queryParams.debug === 'true';
    });

    this.gameService.state$.subscribe((state: State) => {
      const { game, currentPlayerId } = state;
      this.game = game;
      this.currentPlayerId = currentPlayerId;
      if (!game) return;
      this.players = Object.values(game.players).filter(player => player.status === 'playing');
      this.actingPlayer = game.players[game.currentActorId];
      this.timeLeft = game.timeRemaining;
    });
  }

  ngOnDestroy() {
    this.gameService.clearState();
  }

  get teams() {
    return this.game.teamIds.map(id => this.game.teams[id]);
  }

  getCluesGuessedThisTurn() {
    return Object.values(this.game.attempts).filter(attempt => {
     return attempt.turnId === this.game.currentTurnId
      && attempt.status === 'guessed';
    }).length;
  }

  getPointsForTeam(teamId) {
    return Object.values(this.game.attempts).filter(attempt => {
     return attempt.teamId === teamId
      && attempt.status === 'guessed';
    }).length;
  }

  get currentPlayer() {
    return this.game.players[this.currentPlayerId];
  }

  getActor() {
    return this.game.players[this.game.currentActorId];
  }

  getCurrentClue() {
    return this.game.clues[this.game.currentClueId];
  }

  get currentPlayerName() {
    const players = this.game && this.game.players || {};
    const player = players[this.currentPlayerId];
    return player && player.name || '';
  }

  get isActor() {
    return this.currentPlayerId === this.game.currentActorId;
  }

  joinGame() {
    this.gameService.joinGame(this.playerName);
    this.playerName = '';
  }

  submitClues() {
    if (this.clues.every(clue => !!clue.value)) {
      this.gameService.submitClues(this.clues.map(clue => clue.value));
      this.clues = getEmptyClues();
    }
  }

  pickTeams() {
    this.gameService.pickTeams();
  }

  startWritingClues() {
    this.gameService.startEnteringClues();
  }

  startGame() {
    this.gameService.startGame();
  }

  startTurn() {
    this.gameService.startTurn();
  }

  startNextRound() {
    this.gameService.startNextRound();
  }

  guessedClue() {
    this.gameService.guessedClue();
  }

  skipClue() {
    this.gameService.skipClue();
  }

  getCurrentRoundId() {
    return this.game.roundIds[this.game.currentRoundIndex];
  }

  get numCluesRemaining() {
     const clues = Object.values(this.game.clues);
     const currentRoundId = this.getCurrentRoundId();
     return clues.filter(clue => !clue.attemptIds.map(id => this.game.attempts[id]).find(attempt => attempt.roundId === currentRoundId && attempt.status === 'guessed')).length;
  }

  get numCluesGuessedThisTurn() {
    const attempts = Object.values(this.game.attempts);
    return attempts.filter(attempt => attempt.turnId === this.game.currentTurnId && attempt.status === 'guessed').length;
  }

  get currentRound() {
    return this.game.rounds[this.getCurrentRoundId()];
  }

  newGame() {
    this.gameService.newGame();
  }

  get currentPlayerTeam() {
    return this.game.teams[this.currentPlayer.teamId];
  }

  get gameState() {
    return JSON.stringify(this.game.roundIds.map(roundId => {
      const round = this.game.rounds[roundId];
      return {
        type: round.type,
        turns: round.turnIds.map(turnId => {
          const turn = this.game.turns[turnId];
          return {
            player: this.game.players[turn.playerId].name,
            attempts: turn.attemptIds.map(attemptId => {
              const attempt = this.game.attempts[attemptId];
              const clue = this.game.clues[attempt.clueId];
              return {
                status: attempt.status,
                clue: {
                  value: clue.value,
                  createBy: this.game.players[clue.createdByPlayerId].name
                }
              };
            })
          };
        })
      };
    }), null, 2);
  }

  startTimer() {
    this.gameService.startTimer();
  }

  stopTimer() {
    this.gameService.stopTimer();
  }

  switchTeams() {
    this.gameService.switchTeams();
  }

  goHome() {
    this.gameService.goHome();
  }

  onKeyUp(targetKey: string, event: KeyboardEvent, method: Function) {
    if (event.key === targetKey) {
      method.call(this);
    }
  }
}

