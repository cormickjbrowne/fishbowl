import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Game } from './models/game.interface';
import { Player } from './models/player.interface';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { State } from './models/state.interface';
import { Status } from './models/status.interface';
import { mergeWith } from 'lodash';
import * as io from 'socket.io-client';

const waitTime = 5;

const initialState: State = {
 currentPlayerId: undefined,
 game: undefined
};

const mergeStrategy = (objValue, srcValue, key, object, source, stack) => {
  if (key === 'players' || key === 'clues' || key === 'attempts') {
    return srcValue;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GameService {

  public state$ = new BehaviorSubject<State>(initialState);

  public state: State = initialState;

  public socket: any;

  constructor(private http: HttpClient, private router: Router) {
    console.log('Game Service created.');
    this.logState();
  }

  logState() {
    console.log(JSON.stringify(this.state, null, 4));
  }

  createGame(): void {
    this.http.post<Game>('/server/game', {}).subscribe((game: Game) => {
      this.router.navigateByUrl(`/game/${game.id}`);
    });
  }

  setState(objOrFunc: Function | Partial<State>) {
    const partialState = typeof objOrFunc === 'function' ? objOrFunc(this.state) : objOrFunc;
    mergeWith(this.state, partialState, mergeStrategy);
    this.state$.next(this.state);
    this.logState();
    (window as any).state = this.state;
  }

  setPlayerId(currentPlayerId: string) {
    this.setState({ currentPlayerId });
  }

  getGame(id: string): void {
    this.http.get<Game>(`/server/game/${id}`)
    .pipe(catchError((err) => {
      this.router.navigateByUrl('/');
      return throwError(err.error);
    }))
    .subscribe((game: Game) => {
      this.setState({ game });
    });
  }

  joinGame(playerName: string, gameId: string): void {
    const socket = io();
    this.socket = socket;

    socket.on('connect', () => {
      socket.emit('join', { gameId, playerName, playerId: this.state.currentPlayerId });
    });

    socket.on('reconnect', () => {
      socket.emit('join', { gameId, playerId: this.state.currentPlayerId });
    });

    socket.on('state-change', (game) => {
      this.setState({ game });
    });

    socket.on('player-id', (currentPlayerId) => {
      this.setState({ currentPlayerId });
      localStorage.setItem(`${gameId}-currentPlayerId`, this.state.currentPlayerId);
    });

    socket.on('game-not-found', () => {
      this.router.navigateByUrl('/');
    });

    socket.on('player-not-found', () => {
      console.log('Player not found');
      this.setState({ currentPlayerId: undefined });
      localStorage.removeItem(`${gameId}-currentPlayerId`);
    });

    socket.on('disconnect', () => {
      this.router.navigateByUrl('/');
    });
  }

  pickTeams() {
    this.socket.emit('pick-teams');
  }

  startEnteringClues() {
    this.socket.emit('start-entering-clues');
  }

  submitClues(clues: string[]) {
    this.socket.emit('submit-clues', { clues, playerId: this.state.currentPlayerId });
  }

  startGame() {
    this.socket.emit('start-game');
  }

  startTurn() {
    this.socket.emit('start-turn');
  }

  startActing() {
    this.socket.emit('start-acting');
  }

  startNextRound() {
    this.socket.emit('next-round');
  }

  guessedClue() {
    this.socket.emit('clue-guessed');
  }

  skipClue() {
    this.socket.emit('clue-skipped');
  }

  newGame() {
    this.socket.emit('new-game');
  }

  clearState() {
    this.setState(initialState);
  }
}
