const express = require('express')
const app = express()
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = 3000
const { Game } = require('./models/game');
const { Player } = require('./models/player');
const bodyParser = require('body-parser');

const state = {
  rooms: [],
  games: {
    asdf: new Game('asdf')
  },
  players: {},
  sockets: {},
  clues: []
};

const getRandomPlayer = (gameId) => {
  const game = state.games[gameId];
  const randomIndex = Math.floor(Math.random() * game.playerIds.length);
  const randomPlayerId = game.playerIds[randomIndex];
  return state.players[randomPlayerId];
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

app.post('/player', (req, res) => {
  const { name, id } = req.body;
  const player = new Player(name, id);
  state.players[id] = player;
  res.json(player);
});

app.post('/clues', (req, res) => {
  const { clues, playerId, gameId } = req.body;
  if (!Array.isArray(clues)) {
    throw new Error('POST /clues { body: { clues } } is not an Array');
  }
  state.clues = state.clues.concat(clues); // TODO eventually this needs to change
  const game = state.games[gameId];
  if (!game) {
    res.status(404);
    return res.send(`Received POST /clues but could not find game with gameId: ${gameId}`);
  }

  const player = state.players[playerId];
  player.addClues(clues);

  io.emit('player-ready', playerId);
  console.log('Got clues', clues, playerId, gameId);
  res.json({ game: state.games[gameId] });

  const players = game.playerIds.map(id => state.players[id]);

  const randomPlayer = getRandomPlayer(gameId);
  if (players.every(player => player.clues.length === 5)) {
    io.emit('status-change', { status: 'player-ready', actingPlayerId: randomPlayer.id });
  }
});

io.on('connection', function(socket){
  state.sockets[socket.id] = socket;

  console.log('a user connected');

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on('join', (playerId, gameId) => {
   const players = state.players;
   const player = players[playerId];
   const game = state.games[gameId];
   if (!game) { console.log('No Game!'); return; }
   game.addPlayer(playerId);
   player.joinGame(gameId);
   console.log(`New player: ${player.name}`);
   socket.emit('players', Object.values(players).filter(player => player.id !== playerId));
   io.emit('player', player);
  });

  socket.on('disconnect', () => {
    const { id } = socket;
    const player = state.players[id];

    if (player) {
      const game = state.games[player.gameId];
      if (game) {
          game.removePlayer(id);
      }
      player.leaveGame();
      player.resetClues();
    }

    delete state.players[id];
    delete state.sockets[id];
    io.emit('player-left', id);
  });

  socket.on('start-acting', ({ gameId }) => {
    io.emit('acting-started');
    let timeLeft = 5;
    const intervalId = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(intervalId);
        io.emit('acting-finished', getRandomPlayer(gameId).id);
        return;
      }
    }, 1000);
  });
});

io.on('join', (name) => {
  console.log(`New player: ${name}`);
  const player = new Player(name);
  state.players[name] = player;
  console.log(`Players: ${JSON.stringify(state.players, null, 2)}`);
  io.emit('player', player);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
http.listen(5000, () => {
  console.log("started on port 5000");
});
