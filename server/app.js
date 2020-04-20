const express = require('express')
const app = express()
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = 3000
const { Game } = require('./models/game');
const { Player } = require('./models/player');
const bodyParser = require('body-parser');

const state = {
  games: {
    asdf: new Game('asdf')
  },
  players: {},
  sockets: {}
};

app.use(bodyParser.json());

app.get('/', (req, res) => res.send('Hello World!'))

app.post('/game', (req, res) => {
  const game = new Game();
  state.games[game.id] = game;
  res.json(game);
});

app.get('/game/:id', (req, res) => {
  const { id } = req.params;
  const game = state.games[id];

  if (!game) {
    res.status(404);
    res.send(`Could not find game with id: "${id}".`);
  }

  res.json(game);
});

app.put('/game/:id', (req, res) => {
  const { id } = req.params;
  const { status, clues, playerName } = req.body;
  const game = state.games[id];

  if ( status ) {
    game.setStatus(status);
    io.emit('status-change', { status });
  }

  game.setStatus(status);
  res.json(game);
});

app.post('/game/remove-player', (req, res) => {
  const { gameId, playerId } = req.body;
  const game = state.games[gameId];
  if (!game) {
    res.status(404);
    return res.json({
      message: `Could not find game with id: "${gameId}"`
    });
  }
  const player = game.players[playerId];
  if (!player) {
    res.status(404);
    return res.json({
      message: `Could not find player with id: "${playerId}"`
    });
  }
  game.removePlayer(player);
  res.status(200);
  res.send(game);
});

io.on('connection', function(socket){
  const player = new Player(socket.id);
  state.players[player.id] = player;
  state.sockets[socket.id] = socket;
  let game;

  const updateClient = () => {
    socket.to(game.id).emit('state-change', game);
    socket.emit('state-change', game);
  }

  console.log('a user connected');

  socket.on('join', ({ gameId, playerName }) => {
    game = state.games[gameId];
    if (!game) { console.log('No Game!'); return; }
    socket.join(gameId);
    game.events.on('state-change', updateClient)
    player.setName(playerName);
    game.addPlayer(player);
  });

  socket.on('pick-teams', () => game.pickTeams());
  socket.on('change-teams', ({ teams }) => game.changeTeams(teams));
  socket.on('start-entering-clues', () => game.startEnteringClues());
  socket.on('submit-clues', ({ clues }) => game.addClues(clues, player));
  socket.on('start-game', () => game.startGame());
  socket.on('start-turn', () => game.startActing());
  socket.on('clue-guessed', () => game.clueGuessed());
  socket.on('clue-skipped', () => game.clueSkipped());
  socket.on('next-round', () => game.nextRound());
  socket.on('new-game', () => game.newGame());
  socket.on('disconnect', () => {
    if (game) {
      game.removePlayer(player)
    }
    delete state.sockets[socket.id];
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
http.listen(5000, () => {
  console.log("started on port 5000");
});
