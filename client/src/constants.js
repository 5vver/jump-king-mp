const Constants = {
  backgroundImage: null,
  idleImage: null,
  squatImage: null,
  jumpImage: null,
  oofImage: null,
  run1Image: null,
  run2Image: null,
  run3Image: null,
  fallenImage: null,
  width: 0,
  height: 0,
  canvas: null,

  player: null,
  lines: [],
  backgroundImage: null,

  creatingLines: false,

  idleImage: null,
  squatImage: null,
  jumpImage: null,
  oofImage: null,
  run1Image: null,
  run2Image: null,
  run3Image: null,
  fallenImage: null,
  fallImage: null,
  showingLines: false,
  showingCoins: false,

  placingPlayer: false,
  placingCoins: false,
  playerPlaced: false,

  testingSinglePlayer: true,

  fallSound: null,
  jumpSound: null,
  bumpSound: null,
  landSound: null,

  snowImage: null,

  population: null,
  levelDrawn: false,

  startingPlayerActions: 5,
  increaseActionsByAmount: 5,
  increaseActionsEveryXGenerations: 10,
  evolationSpeed: 1,
  font: null,
  connection: null,
  joinedPlayers: new Set([]),
  // Stream client player data to server on connect
  streamInterval: null,
  // The name of player
  playerName: "",

  levelNumber: 0,
  previousFrameRate: 60,

  replayingBestPlayer: false,
  cloneOfBestPlayer: null,

  mousePos1: null,
  mousePos2: null,
  linesString: "",

  levelImages: [],
  levels: [],
};

export { Constants };
