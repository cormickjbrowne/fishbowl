## Checkout ##
To checkout the repo run: `git clone git@github.com:cormickjbrowne/fishbowl.git`

## Installation ##
Change directory and install:
`cd fishbowl` and `npm install`. If you don't have `npm` installed, you should download and install `node`. Any of the LTS (long term support) versions over 10.x.x should be fine. https://nodejs.org/en/download/

## Running the App ##
Once the project has been checked out and the dependencies have been installed you can start the app. In order to do this you need to start two process, the client and the server.

To start the server run `npm run start:server`. This will start the RESTful nodejs/express application server that accepts HTTP and websocket requests. The entry point for the server code is found in `server/app.js`.

To start the client run `npm start`. This will start the static web server. This will server your static assets (html, css, javascript) using Webpack dev server. Once the process is done starting up you should be able to view the app at `http://localhost:4200`. Most of the logic for the web app lives in `src/app/new-game/new-game.component.ts` and `src/app/game.service.ts`.

