let width = 0;
let height = 0;
let canvas = null;

let player = null;
let lines = [];
let backgroundImage = null;

let creatingLines = false;

let idleImage = null;
let squatImage = null;
let jumpImage = null;
let oofImage = null;
let run1Image = null;
let run2Image = null;
let run3Image = null;
let fallenImage = null;
let fallImage = null;
let showingLines = false;
let showingCoins = false;
let levelImages = [];

let placingPlayer = false;
let placingCoins = false;
let playerPlaced = false;

let testingSinglePlayer = true;

let fallSound = null;
let jumpSound = null;
let bumpSound = null;
let landSound = null;

let snowImage = null;

let population = null;
let levelDrawn = false;

let startingPlayerActions = 5;
let increaseActionsByAmount = 5;
let increaseActionsEveryXGenerations = 10;
let evolationSpeed = 1;

let font;
let connection;

function preload() {
  backgroundImage = loadImage("src/assets/images/levelImages/1.png");
  idleImage = loadImage("src/assets/images/poses/idle.png");
  squatImage = loadImage("src/assets/images/poses/squat.png");
  jumpImage = loadImage("src/assets/images/poses/jump.png");
  oofImage = loadImage("src/assets/images/poses/oof.png");
  run1Image = loadImage("src/assets/images/poses/run1.png");
  run2Image = loadImage("src/assets/images/poses/run2.png");
  run3Image = loadImage("src/assets/images/poses/run3.png");
  fallenImage = loadImage("src/assets/images/poses/fallen.png");
  fallImage = loadImage("src/assets/images/poses/fall.png");

  snowImage = loadImage("src/assets/images/snow3.png");

  for (let i = 1; i <= 43; i++) {
    levelImages.push(loadImage("src/assets/images/levelImages/" + i + ".png"));
  }

  jumpSound = loadSound("src/assets/sounds/jump.mp3");
  fallSound = loadSound("src/assets/sounds/fall.mp3");
  bumpSound = loadSound("src/assets/sounds/bump.mp3");
  landSound = loadSound("src/assets/sounds/land.mp3");

  font = loadFont("src/assets/fonts/ttf_alkhemikal.ttf");
}

const getSessionId = () =>
  new URL(window.location.href).pathname.match(/[^\/]+/g)?.[0];

// TODO: change to Set
let joinedPlayers = [];

// Stream client player data to server on connect
let streamInterval;

// Spawn main player & joined players on connection
const onSessionJoin = (conn, connType, msg) => {
  const clientId = conn.getClientId();
  const playerName = msg.Data?.PlayerName;

  let sessionId = getSessionId();
  if (!sessionId && msg.SessionId) {
    sessionId = msg.SessionId;
    window.location.href = `${window.location.href}${sessionId}`;
  }

  if (connType === "start" && !player) {
    player = new Player(clientId, playerName);

    const connections = msg.Data?.Connections;
    for (const connectionId of connections) {
      if (connectionId === clientId) {
        continue;
      }
      joinedPlayers.push(new Player(connectionId, playerName));
    }

    streamInterval = setInterval(
      () => {
        if (!conn.connected) {
          clearInterval(streamInterval);
          return;
        }

        const data = {
          x: player.currentPos.x,
          y: player.currentPos.y,
          leftHeld: player.leftHeld,
          rightHeld: player.rightHeld,
          jumpHeld: player.jumpHeld,
          facingRight: player.facingRight,
          currentLevelNo: player.currentLevelNo,
          isOnGround: player.isOnGround,
          isSlidding: player.isSlidding,
          currentSpeedX: player.currentSpeed.x,
          currentSpeedY: player.currentSpeed.y,
          sliddingRight: player.sliddingRight,
          hasFallen: player.hasFallen,
        };
        conn.send({ Type: "action", Data: data });
      },
      // send 20 times per second
      50,
    );

    return;
  }

  if (joinedPlayers.every((p) => p.id !== msg.ClientId)) {
    joinedPlayers.push(new Player(msg.ClientId, playerName));
  }
};
// Remove disconnected players
const onSessionQuit = (clientId) => {
  joinedPlayers = joinedPlayers.filter((p) => {
    const matched = p.id === clientId || !clientId;
    if (matched) {
      delete p;
    }

    return !matched;
  });
};
// Update joined players state
const onActionReceive = (msg) => {
  const id = msg.ClientId;
  const data = msg.Data;

  const updatePlayer = joinedPlayers.find((p) => p.id === id);
  if (!updatePlayer) {
    return;
  }
  updatePlayer.currentPos = createVector(data.x, data.y);
  updatePlayer.rightHeld = data.rightHeld;
  updatePlayer.leftHeld = data.leftHeld;
  updatePlayer.jumpHeld = data.jumpHeld;
  updatePlayer.facingRight = data.facingRight;
  updatePlayer.currentLevelNo = data.currentLevelNo;
  updatePlayer.isOnGround = data.isOnGround;
  updatePlayer.isSlidding = data.isSlidding;
  updatePlayer.currentSpeed.x = data.currentSpeedX;
  updatePlayer.currentSpeed.y = data.currentSpeedY;
  updatePlayer.sliddingRight = data.sliddingRight;
  updatePlayer.hasFallen = data.hasFallen;
};

const onConnected = (conn) => {
  const sessionSlug = getSessionId();
  // types: info, connect, disconnect, action, session
  const connectMessage = {
    Type: "connect",
    SessionId: sessionSlug?.length > 0 ? sessionSlug : undefined,
    Data: {
      SessionType: sessionSlug?.length > 0 ? "connect" : "create",
      PlayerName: "serega34",
    },
  };
  conn.send(connectMessage);
};

function setup() {
  setupCanvas();

  connection = new ClientConnection({
    onConnected,
    onSessionJoin,
    onSessionQuit,
    onActionReceive,
  });

  population = new Population(600); // ai shit
  setupLevels();
  jumpSound.playMode("sustain");
  fallSound.playMode("sustain");
  bumpSound.playMode("sustain");
  landSound.playMode("sustain");
}

function drawMousePosition() {
  let snappedX = mouseX - (mouseX % 20);
  let snappedY = mouseY - (mouseY % 20);
  push();

  fill(255, 0, 0);
  noStroke();
  ellipse(snappedX, snappedY, 5);

  if (mousePos1 != null) {
    stroke(255, 0, 0);
    strokeWeight(5);
    line(mousePos1.x, mousePos1.y, snappedX, snappedY);
  }

  pop();
}

let levelNumber = 0;

function draw() {
  background(10);
  push();
  translate(0, 50);

  if (player) {
    image(levels[player.currentLevelNo].levelImage, 0, 0);
    levels[player.currentLevelNo].show();
    player.Update();
    player.Show();
  } else {
    image(levels[0].levelImage, 0, 0);
    levels[0].show();
  }

  for (const joined of joinedPlayers) {
    joined.Update();

    // show joined player only on the same level
    if (player?.currentLevelNo === joined.currentLevelNo) {
      joined.Show();
    }
  }

  if (showingLines || creatingLines) showLines();

  if (creatingLines) drawMousePosition();

  if (frameCount % 15 === 0) {
    previousFrameRate = floor(getFrameRate());
  }

  pop();

  fill(0);
  noStroke();
  rect(0, 0, width, 50);
  if (!testingSinglePlayer) {
    textSize(32);
    fill(255, 255, 255);
    text("FPS: " + previousFrameRate, width - 160, 35);
    text("Gen: " + population.gen, 30, 35);
    text("Moves: " + population.players[0].brain.instructions.length, 200, 35);
    text("Best Height: " + population.bestHeight, 400, 35);
  }
}

let previousFrameRate = 60;

function showLevel(levelNumberToShow) {
  levels[levelNumberToShow].show();
}

function showLines() {
  if (creatingLines) {
    for (let l of lines) {
      l.Show();
    }
  } else {
    for (let l of levels[player.currentLevelNo].lines) {
      l.Show();
    }
  }
}

function setupCanvas() {
  canvas = createCanvas(1200, 950);
  canvas.parent("canvas");
  width = canvas.width;
  height = canvas.height - 50;
}

const getPlayerJumpTimeout = () =>
  setTimeout(() => {
    player.jumpHeld = false;
    player.Jump();
  }, 600);

let playerJumpTimeout;

function keyPressed() {
  switch (key) {
    case " ":
      player.jumpHeld = true;
      playerJumpTimeout = getPlayerJumpTimeout();
      break;
    case "R":
      player.ResetPlayer();
      for (const joined of joinedPlayers) {
        joined.ResetPlayer();
      }
      break;
    case "S":
      bumpSound.stop();
      jumpSound.stop();
      landSound.stop();
      fallSound.stop();
      break;
  }

  switch (keyCode) {
    case LEFT_ARROW:
      player.leftHeld = true;
      break;
    case RIGHT_ARROW:
      player.rightHeld = true;
      break;
  }
}
let replayingBestPlayer = false;
let cloneOfBestPlayer = null;

function keyReleased() {
  switch (key) {
    case "B":
      replayingBestPlayer = true;
      cloneOfBestPlayer =
        population.cloneOfBestPlayerFromPreviousGeneration.clone();
      evolationSpeed = 1;
      mutePlayers = false;
      break;

    case " ":
      if (!creatingLines && player.jumpHeld) {
        clearTimeout(playerJumpTimeout);
        player.jumpHeld = false;
        player.Jump();
      }
      break;
    case "R":
      if (creatingLines) {
        lines = [];
        linesString = "";
        mousePos1 = null;
        mousePos2 = null;
      }
      break;
    case "N":
      if (creatingLines) {
        levelNumber += 1;
        linesString += "\nlevels.push(tempLevel);";
        linesString += "\ntempLevel = new Level();";
        print(linesString);
        lines = [];
        linesString = "";
        mousePos1 = null;
        mousePos2 = null;
      } else {
        player.currentLevelNo += 1;
        print(player.currentLevelNo);
      }
      break;
    case "D":
      if (creatingLines) {
        mousePos1 = null;
        mousePos2 = null;
      }
  }

  switch (keyCode) {
    case LEFT_ARROW:
      player.leftHeld = false;
      break;
    case RIGHT_ARROW:
      player.rightHeld = false;
      break;
    case DOWN_ARROW:
      evolationSpeed = constrain(evolationSpeed - 1, 0, 50);
      print(evolationSpeed);

      break;
    case UP_ARROW:
      evolationSpeed = constrain(evolationSpeed + 1, 0, 50);
      print(evolationSpeed);
      break;
  }
}

let mousePos1 = null;
let mousePos2 = null;
let linesString = "";

function mouseClicked() {
  if (creatingLines) {
    let snappedX = mouseX - (mouseX % 20);
    let snappedY = mouseY - (mouseY % 20);
    if (mousePos1 == null) {
      mousePos1 = createVector(snappedX, snappedY);
    } else {
      mousePos2 = createVector(snappedX, snappedY);
      // print('tempLevel.lines.push(new Line(' + mousePos1.x + ',' + mousePos1.y + ',' + mousePos2.x + ',' + mousePos2.y + '));');
      lines.push(new Line(mousePos1.x, mousePos1.y, mousePos2.x, mousePos2.y));
      linesString +=
        "\ntempLevel.lines.push(new Line(" +
        mousePos1.x +
        "," +
        mousePos1.y +
        "," +
        mousePos2.x +
        "," +
        mousePos2.y +
        "));";
      mousePos1 = null;
      mousePos2 = null;
    }
  } else if (placingPlayer && !playerPlaced && player) {
    playerPlaced = true;
    player.currentPos = createVector(mouseX, mouseY);
  } else if (placingCoins) {
  }
  print(
    "levels[" +
      player?.currentLevelNo +
      "].coins.push(new Coin( " +
      floor(mouseX) +
      "," +
      floor(mouseY - 50) +
      ' , "progress" ));',
  );
}
