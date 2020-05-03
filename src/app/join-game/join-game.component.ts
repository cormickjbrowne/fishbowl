import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-join-game',
  templateUrl: './join-game.component.html',
  styleUrls: ['./join-game.component.scss']
})
export class JoinGameComponent implements OnInit {

  public gameId: string;

  constructor(private router: Router) { }

  ngOnInit() {
  }

  public joinGame() {
      this.router.navigateByUrl(`/game/${this.gameId}`);
  }

  onKeyUp(targetKey: string, event: KeyboardEvent, method: Function) {
    if (event.key === targetKey) {
      method.call(this);
    }
  }
}
