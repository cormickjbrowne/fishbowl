import { Game } from './game.interface';
import { Player } from './player.interface';

export interface State {
  currentPlayerId?: string;
  game?: Game;
}
