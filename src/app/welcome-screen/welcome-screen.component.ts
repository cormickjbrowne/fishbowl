import { Component, OnInit } from '@angular/core';
import { GameService } from '../game.service';
import { Router } from '@angular/router';
import { Game } from '../models/game.interface';

@Component({
  selector: 'app-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.scss']
})
export class WelcomeScreenComponent implements OnInit {

  public message: string;
  constructor(private gameService: GameService, private router: Router) { }

  ngOnInit() {}

  public createNewGame() {
    this.gameService.createGame();
  }

  public joinGame() {
    this.router.navigateByUrl(`/join-game`);
  }
}
