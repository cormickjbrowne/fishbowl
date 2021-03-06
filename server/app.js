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
    return res.json({ message: `Could not find game with id: "${id}".` });
  }

  res.status(200);
  if (req.query.debug) {
    return res.json(game.denormalize())
  }

  res.set('Content-Type', 'application/json')
  res.send(game.serialize());
});

app.get('/games', (req, res) => {
  res.status(200);
  res.json(Object.values(state.games).map(game => game.denormalize()));
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
  res.set('Content-Type', 'application/json');
  res.send(game.serialize());
});

app.post('/game/boot-player', (req, res) => {
  const { gameId, playerId } = req;
  const player = state.players[playerId];
  if (!player) {
    res.status(404);
    return res.send({ message: 'Player not found.' });
  }
  const socket = state.sockets[player.socketId];
  socket.emit('player-not-found');
  res.status(200);
  res.send({ message: 'ok' });
});

app.post('/game/stop-timer', (req, res) => {
  const { gameId } = req.body;
  const game = state.games[gameId];

  if (!game) {
    res.status(400);
    return res.send({ message: `Could not find game with id: "${gameId}"` });
  }

  game.stopTimer();
  res.status(200);
  res.send(game);
});

app.post('/game/start-timer', (req, res) => {
  const { gameId } = req.body;
  const game = state.games[gameId];

  if (!game) {
    res.status(400);
    return res.send({ message: `Could not find game with id: "${gameId}"` });
  }

  game.startTimer();
  res.status(200);
  res.send(game);
});

io.on('connection', function(socket){
  console.log('socket.on("connect")', socket.id);
  state.sockets[socket.id] = socket;
  let game;
  let subscription;

  const updateClient = (state) => {
    console.log('socket.emit("state-change")');
    console.log(state);
    console.log('game.players', game.players)
    socket.to(game.id).emit('state-change', state);
    socket.emit('state-change', state);
  }

  console.log('a user connected');

  socket.on('join', ({ gameId, playerName, playerId }) => {
       console.log('socket.on("join")', "socketId:", socket.id, "gameId:", gameId, "playerName:", playerName);
       game = state.games[gameId];
       if (!game) { console.log('Game not found.'); return socket.emit('game-not-found'); }
       let player = game.players[playerId];
       if (player) {
        console.log('Found player.');
        const oldSocket = state.sockets[player.socketId];
        if (oldSocket && oldSocket.id !== socket.id) {
          console.log('oldSocket', oldSocket.id);
          console.log('newSocket', socket.id);
          console.log('oldSocket.emit("new-socket")');
          oldSocket.emit('new-socket');
          delete state.sockets[oldSocket.id];
        }
       } else if (playerName) {
        console.log('Creating new player...');
        player = new Player(playerName);
        console.log(player);
       } else {
        console.log('Player not found. Clearing old player id.');
        return socket.emit('player-not-found');
       }
       socket.playerId = player.id;
       player.socketId = socket.id;
       console.log('socket.emit("player-id")');
       socket.emit('player-id', player.id);
       state.players[player.id] = player;
       socket.join(gameId);
       console.log('Subscribe socket to "state-change"');
       subscription = game.events.subscribe(updateClient);
       game.addPlayer(player);
  });

  socket.on('pick-teams', () => game.pickTeams());
  socket.on('switch-teams', ({ playerId }) => game.switchTeams(playerId));
  socket.on('start-entering-clues', () => game.startEnteringClues());
  socket.on('submit-clues', ({ clues, playerId }) => game.addClues(clues, playerId));
  socket.on('start-game', () => game.startGame());
  socket.on('start-turn', () => game.startActing());
  socket.on('clue-guessed', () => game.clueGuessed());
  socket.on('clue-skipped', () => game.clueSkipped());
  socket.on('next-round', () => game.nextRound());
  socket.on('new-game', () => game.newGame());
  socket.on('disconnect', () => {
    console.log('socket.on("disconnect")');
    const player = state.players[socket.playerId];
    if (game && player) {
      console.log('player disconnected', player.name);
      game.removePlayer(player, socket.id);
      subscription && subscription.unsubscribe();
      delete state.players[player.id];
    }
    delete state.sockets[socket.id];
  });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
http.listen(5000, () => {
  console.log("started on port 5000");
});
