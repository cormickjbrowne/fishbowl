import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { WelcomeScreenComponent } from './welcome-screen/welcome-screen.component';
import { NewGameComponent } from './new-game/new-game.component';
import { JoinGameComponent } from './join-game/join-game.component';

const routes: Routes = [{
  path: '',
  component: WelcomeScreenComponent
}, {
  path: "join-game",
  component: JoinGameComponent
}, {
  path: "game/:id",
  component: NewGameComponent
}];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
