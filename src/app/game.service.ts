import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, NavigationEnd, ParamMap, Router } from '@angular/router';
import { Game } from './models/game.interface';
import { Player } from './models/player.interface';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { State } from './models/state.interface';
import { Status } from './models/status.interface';
import { mergeWith } from 'lodash';
import * as io from 'socket.io-client';
import { findRoute } from './utils';

const waitTime = 5;

const initialState: State = {
 currentPlayerId: undefined,
 game: undefined
};

const mergeStrategy = (objValue, srcValue, key, object, source, stack) => {
  if (key === 'players' || key === 'clues' || key === 'attempts' || key === 'teams') {
    return srcValue;
  }
}

const localStorageKey = (gameId: string) => `${gameId}-currentPlayerId`;

@Injectable({
  providedIn: 'root'
})
export class GameService {

  public state$ = new BehaviorSubject<State>(initialState);

  public state: State = initialState;

  public socket: any;

  constructor(private http: HttpClient, private router: Router) {
    router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const gameRoute = findRoute(
          router.routerState,
          (route: ActivatedRoute) => {
            let match = false;
            route.paramMap
              .pipe(take(1))
              .subscribe((paramMap: ParamMap) => {
                if (paramMap.keys.includes('gameId')) {
                  match = true;
                }
              })
            return match;
          }
        );

        if (!gameRoute) {
          console.log('Could not find gameId in tree of routes.');
          if (this.socket) {
            console.log('this.socket.close();');
            this.socket.close();
          }
          const {currentPlayerId, game} = this.state;
          if (currentPlayerId && game) {
            console.log('Storing playerId for game,', game.id);
            this.addPlayerIdToStorage(currentPlayerId);
          }
          this.setState(initialState);
          return;
        }

        gameRoute.paramMap.pipe(take(1)).subscribe((paramMap: ParamMap) => {
          const gameId = paramMap.get('gameId');
          console.log('Found route params with :gameId,', gameId);
          this.http.get(`/server/game/${gameId}`).subscribe(
            (game: Game) => {
              console.log(`Got game from /server/game/${gameId}`);
              this.setState({ game });
              const currentPlayerId = this.getPlayerIdFromStorage(game.id);
              if (currentPlayerId) {
                console.log('Found playerId in localStorage', currentPlayerId);
                const currentPlayer = game.players[currentPlayerId];
                if (currentPlayer) {
                  console.log('Found player in game with id', currentPlayerId);
                  this.setPlayerId(currentPlayerId);
                  this.joinGame();
                } else {
                  console.log('Could not find player in game with id', currentPlayerId);
                  this.resetPlayerId();
                }
              } else {
                console.log('Could not find playerId in localStorage', currentPlayerId);
                this.resetPlayerId();
              }
            },
            (error) => {
              console.log(`Could not find game at /server/game/${gameId}`);
              this.removePlayerIdFromStorage(gameId);
              this.setState(initialState);
              this.router.navigateByUrl('/');
            }
          );
        });
      }
    });
    console.log('Game Service created.');
    this.logState();
  }

  logState() {
//     console.log(JSON.stringify(this.state, null, 4));
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
    currentPlayerId
      ? this.addPlayerIdToStorage(currentPlayerId)
      : this.removePlayerIdFromStorage();

    this.setState({ currentPlayerId });
  }

  resetPlayerId() {
    this.setPlayerId(initialState.currentPlayerId);
  }

  joinGame(playerName?: string): void {
    console.log('socket.connect()');
    const socket = io();
    this.socket = socket;

    socket.on('connect', () => {
      console.log('socket.on("connect")');
      console.log('socket.emit("join")');
      socket.emit('join', {
        gameId: this.state.game.id,
        playerName,
        playerId: this.state.currentPlayerId
      });
    });

    socket.on('reconnect', () => {
      console.log('socket.on("reconnect")');
      console.log('socket.emit("join")');
      socket.emit('join', { gameId: this.state.game.id, playerId: this.state.currentPlayerId });
    });

    socket.on('state-change', (game) => {
      console.log('socket.on("state-change")');
      console.log('this.setState({ game })');
      this.setState({ game });
    });

    socket.on('player-id', (currentPlayerId) => {
      console.log('socket.on("player-id")');
      console.log('this.setPlayerId(currentPlayerId);');
      console.log('this.addPlayerIdToStorage(currentPlayerId);');
      this.setPlayerId(currentPlayerId);
      this.addPlayerIdToStorage(currentPlayerId);
    });

    socket.on('game-not-found', () => {
      console.log('socket.on("game-not-found")');
      this.clearState();
      this.router.navigateByUrl('/');
    });

    socket.on('player-not-found', () => {
      console.log('socket.on("player-not-found")');
      this.clearState();
      this.removePlayerIdFromStorage();
    });

    socket.on('new-socket', () => {
      console.log('socket.on("new-socket")');
      this.clearState();
      this.router.navigateByUrl('/');
    });
  }

  addPlayerIdToStorage(playerId: string) {
    localStorage.setItem(localStorageKey(this.state.game.id), playerId);
  }

  removePlayerIdFromStorage(gameId?: string) {
    console.log(`localStorage.removeItem(${gameId || this.state.game.id})`);
    localStorage.removeItem(localStorageKey(gameId || this.state.game.id));
  }

  getPlayerIdFromStorage(gameId: string) {
    return localStorage.getItem(localStorageKey(gameId));
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
    console.log('game.service.clearState()');
    if (this.socket) {
      this.socket.close();
    }
    this.setState(initialState);
  }

  startTimer() {
    this.http.post('/server/game/start-timer', { gameId: this.state.game.id }).subscribe();
  }

  stopTimer() {
    this.http.post('/server/game/stop-timer', { gameId: this.state.game.id }).subscribe();
  }

  switchTeams() {
    this.socket.emit('switch-teams', { playerId: this.state.currentPlayerId });
  }

  goHome() {
    this.router.navigateByUrl('/');
  }
}
