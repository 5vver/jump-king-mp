import { ClientConnection } from "./connection";
import { setupLevels } from "./LevelSetupFunction";
import { Constants } from "./constants.js";
import { Line } from "./Line";
import { createModal, getSessionId } from "./utils";
import { Player } from "./Player.js";

function preload() {
  Constants.backgroundImage = window.loadImage(
    "src/assets/images/levelImages/1.png",
  );
  Constants.idleImage = window.loadImage("src/assets/images/poses/idle.png");
  Constants.squatImage = window.loadImage("src/assets/images/poses/squat.png");
  Constants.jumpImage = window.loadImage("src/assets/images/poses/jump.png");
  Constants.oofImage = window.loadImage("src/assets/images/poses/oof.png");
  Constants.run1Image = window.loadImage("src/assets/images/poses/run1.png");
  Constants.run2Image = window.loadImage("src/assets/images/poses/run2.png");
  Constants.run3Image = window.loadImage("src/assets/images/poses/run3.png");
  Constants.fallenImage = window.loadImage(
    "src/assets/images/poses/fallen.png",
  );
  Constants.fallImage = window.loadImage("src/assets/images/poses/fall.png");

  Constants.snowImage = window.loadImage("src/assets/images/snow3.png");

  for (let i = 1; i <= 43; i++) {
    Constants.levelImages.push(
      window.loadImage("src/assets/images/levelImages/" + i + ".png"),
    );
  }

  Constants.jumpSound = window.loadSound("src/assets/sounds/jump.mp3");
  Constants.fallSound = window.loadSound("src/assets/sounds/fall.mp3");
  Constants.bumpSound = window.loadSound("src/assets/sounds/bump.mp3");
  Constants.landSound = window.loadSound("src/assets/sounds/land.mp3");

  Constants.font = window.loadFont("src/assets/fonts/ttf_alkhemikal.ttf");
}

// Spawn main Constants.player & joined players on connection
const onSessionJoin = (conn, connType, msg) => {
  const clientId = conn.getClientId();
  const pName = msg.Data?.PlayerName;

  let sessionId = getSessionId();
  if (!sessionId && msg.SessionId) {
    sessionId = msg.SessionId;
    window.location.href = `${window.location.href}${sessionId}`;
  }

  if (connType === "start" && !Constants.player) {
    Constants.player = new Player(clientId, pName);

    const connections = msg.Data?.Connections;
    for (const [connectionId, connectionName] of Object.entries(connections)) {
      if (connectionId === clientId) {
        continue;
      }
      Constants.joinedPlayers.add(new Player(connectionId, connectionName));
    }

    Constants.streamInterval = setInterval(
      () => {
        if (!conn.connected) {
          clearInterval(Constants.streamInterval);
          return;
        }

        const data = {
          x: Constants.player.currentPos.x,
          y: Constants.player.currentPos.y,
          leftHeld: Constants.player.leftHeld,
          rightHeld: Constants.player.rightHeld,
          jumpHeld: Constants.player.jumpHeld,
          facingRight: Constants.player.facingRight,
          currentLevelNo: Constants.player.currentLevelNo,
          isOnGround: Constants.player.isOnGround,
          isSlidding: Constants.player.isSlidding,
          currentSpeedX: Constants.player.currentSpeed.x,
          currentSpeedY: Constants.player.currentSpeed.y,
          sliddingRight: Constants.player.sliddingRight,
          hasFallen: Constants.player.hasFallen,
        };
        conn.send({ Type: "action", Data: data });
      },
      // send 25 times per second
      40,
    );

    return;
  }

  if ([...Constants.joinedPlayers].every((p) => p.id !== msg.ClientId)) {
    Constants.joinedPlayers.add(new Player(msg.ClientId, pName));
  }
};

// Remove disconnected players
const onSessionQuit = (clientId) => {
  Constants.joinedPlayers.forEach((p) => {
    if (p.id === clientId || !clientId) {
      Constants.joinedPlayers.delete(p);
    }
  });
};

// Update joined players state
const onActionReceive = (msg) => {
  const id = msg.ClientId;
  const data = msg.Data;

  const updatePlayer = [...Constants.joinedPlayers].find((p) => p.id === id);
  if (!updatePlayer) {
    return;
  }
  updatePlayer.currentPos = window.createVector(data.x, data.y);
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
      PlayerName: Constants.playerName,
    },
  };
  conn.send(connectMessage);
};

function setupCanvas() {
  Constants.canvas = window.createCanvas(1200, 950);
  Constants.canvas.parent("canvas");
  Constants.width = Constants.canvas.width;
  Constants.height = Constants.canvas.height - 50;
}

function setup() {
  createModal((inputValue, hide) => {
    if (
      !inputValue ||
      typeof inputValue !== "string" ||
      inputValue.length < 1
    ) {
      return;
    }

    hide();
    Constants.playerName = inputValue.replace(/ /g, "");
    Constants.connection = new ClientConnection({
      onConnected,
      onSessionJoin,
      onSessionQuit,
      onActionReceive,
    });
  });
  // createChatWindow();
  setupCanvas();

  setupLevels();
  Constants.jumpSound.playMode("sustain");
  Constants.fallSound.playMode("sustain");
  Constants.bumpSound.playMode("sustain");
  Constants.landSound.playMode("sustain");
}

function drawMousePosition() {
  let snappedX = mouseX - (mouseX % 20);
  let snappedY = mouseY - (mouseY % 20);
  window.push();

  window.fill(255, 0, 0);
  window.noStroke();
  window.ellipse(snappedX, snappedY, 5);

  if (Constants.mousePos1 != null) {
    window.stroke(255, 0, 0);
    window.strokeWeight(5);
    window.line(
      Constants.mousePos1.x,
      Constants.mousePos1.y,
      snappedX,
      snappedY,
    );
  }

  window.pop();
}

function draw() {
  window.background(10);
  window.push();
  window.translate(0, 50);

  if (Constants.player) {
    window.image(
      Constants.levels[Constants.player.currentLevelNo].levelImage,
      0,
      0,
    );
    Constants.levels[Constants.player.currentLevelNo].show();
    Constants.player.Update();
    Constants.player.Show();
  } else {
    // something fails here - levels levelImage - undefined
    window.image(Constants.levels[0]?.levelImage, 0, 0);
    Constants.levels[0].show();
  }

  Constants.joinedPlayers.forEach((p) => {
    p.Update();

    // show joined Constants.player only on the same level
    if (Constants.player?.currentLevelNo === p.currentLevelNo) {
      p.Show();
    }
  });

  if (Constants.showingLines || Constants.creatingLines) showLines();

  if (Constants.creatingLines) drawMousePosition();

  if (window.frameCount % 15 === 0) {
    Constants.previousFrameRate = window.floor(window.getFrameRate());
  }

  window.pop();

  window.fill(0);
  window.noStroke();
  window.rect(0, 0, Constants.width, 50);

  window.textSize(32);
  window.textFont(Constants.font);
  window.fill(255, 255, 255);
  // text("FPS: " + previousFrameRate, width - 160, 35);
  window.text(
    `Session: ${Constants.connection ? Constants.connection.getSessionId() : "no"}`,
    20,
    35,
  );
  const isConnected = !!Constants.connection?.getIsConnected();
  window.fill(isConnected ? 0 : 255, isConnected ? 255 : 0, 0);
  window.text(
    isConnected ? "Connected" : "Disconnected",
    Constants.width - 160,
    35,
  );
}

function showLevel(levelNumberToShow) {
  Constants.levels[levelNumberToShow].show();
}

function showLines() {
  if (Constants.creatingLines) {
    for (let l of Constants.lines) {
      l.Show();
    }
  } else {
    for (let l of Constants.levels[Constants.player.currentLevelNo].lines) {
      l.Show();
    }
  }
}

function keyPressed() {
  if (!Constants.player) {
    return;
  }

  switch (key) {
    case " ":
      Constants.player.jumpHeld = true;
      break;
    case "R":
      Constants.player.ResetPlayer();
      Constants.joinedPlayers.forEach((p) => {
        p.ResetPlayer();
      });
      break;
    case "S":
      Constants.bumpSound.stop();
      Constants.jumpSound.stop();
      Constants.landSound.stop();
      Constants.fallSound.stop();
      break;
  }

  switch (keyCode) {
    case LEFT_ARROW:
      Constants.player.leftHeld = true;
      break;
    case RIGHT_ARROW:
      Constants.player.rightHeld = true;
      break;
  }
}

function keyReleased() {
  if (!Constants.player) {
    return;
  }

  switch (key) {
    // case "B":
    //   replayingBestPlayer = true;
    //   cloneOfBestPlayer =
    //     population.cloneOfBestPlayerFromPreviousGeneration.clone();
    //   evolationSpeed = 1;
    //   mutePlayers = false;
    //   break;

    case " ":
      if (!Constants.creatingLines && Constants.player.jumpHeld) {
        Constants.player.jumpHeld = false;
        Constants.player.Jump();
      }
      break;
    case "R":
      if (Constants.creatingLines) {
        Constants.lines = [];
        Constants.linesString = "";
        Constants.mousePos1 = null;
        Constants.mousePos2 = null;
      }
      break;
    case "N":
      return; // disable
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
        Constants.player.currentLevelNo += 1;
        print(Constants.player.currentLevelNo);
      }
      break;
    case "D":
      if (Constants.creatingLines) {
        Constants.mousePos1 = null;
        Constants.mousePos2 = null;
      }
  }

  switch (keyCode) {
    case LEFT_ARROW:
      Constants.player.leftHeld = false;
      break;
    case RIGHT_ARROW:
      Constants.player.rightHeld = false;
      break;
    case DOWN_ARROW:
      Constants.evolationSpeed = window.constrain(
        Constants.evolationSpeed - 1,
        0,
        50,
      );
      break;
    case UP_ARROW:
      Constants.evolationSpeed = window.constrain(
        Constants.evolationSpeed + 1,
        0,
        50,
      );
      // print(evolationSpeed);
      break;
  }
}

function mouseClicked() {
  if (Constants.creatingLines) {
    let snappedX = window.mouseX - (window.mouseX % 20);
    let snappedY = window.mouseY - (window.mouseY % 20);
    if (Constants.mousePos1 == null) {
      Constants.mousePos1 = window.createVector(snappedX, snappedY);
    } else {
      Constants.mousePos2 = window.createVector(snappedX, snappedY);
      // print('tempLevel.lines.push(new Line(' + mousePos1.x + ',' + mousePos1.y + ',' + mousePos2.x + ',' + mousePos2.y + '));');
      lines.push(
        new Line(
          Constants.mousePos1.x,
          Constants.mousePos1.y,
          Constants.mousePos2.x,
          Constants.mousePos2.y,
        ),
      );
      linesString +=
        "\ntempLevel.lines.push(new Line(" +
        Constants.mousePos1.x +
        "," +
        Constants.mousePos1.y +
        "," +
        Constants.mousePos2.x +
        "," +
        Constants.mousePos2.y +
        "));";
      Constants.mousePos1 = null;
      Constants.mousePos2 = null;
    }
  } else if (
    Constants.placingPlayer &&
    !Constants.playerPlaced &&
    Constants.player
  ) {
    Constants.playerPlaced = true;
    Constants.player.currentPos = window.createVector(
      window.mouseX,
      window.mouseY,
    );
  }
}

// p5 lib workaround
window.preload = preload;
window.setupCanvas = setupCanvas;
window.setup = setup;
window.drawMousePosition = drawMousePosition;
window.draw = draw;
window.showLevel = showLevel;
window.showLines = showLines;
window.keyPressed = keyPressed;
window.keyReleased = keyReleased;
window.mouseClicked = mouseClicked;
