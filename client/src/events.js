import { GameState } from "./constants";
import { Player } from "./Player";

// Spawn main player & joined players on connection
const onSessionJoin = (conn, connType, msg) => {
  const clientId = conn.getClientId();
  const pName = msg.Data?.PlayerName;

  if (connType === "start" && !GameState.player) {
    GameState.player = new Player(clientId, pName, true);

    const connections = msg.Data?.Connections;
    for (const [connectionId, connectionName] of Object.entries(connections)) {
      if (connectionId === clientId) {
        continue;
      }
      GameState.joinedPlayers.add(
        new Player(connectionId, connectionName, false),
      );
    }

    GameState.streamInterval = setInterval(
      () => {
        if (!conn.connected) {
          clearInterval(GameState.streamInterval);
          return;
        }

        const data = {
          x: GameState.player.currentPos.x,
          y: GameState.player.currentPos.y,
          leftHeld: GameState.player.leftHeld,
          rightHeld: GameState.player.rightHeld,
          jumpHeld: GameState.player.jumpHeld,
          facingRight: GameState.player.facingRight,
          currentLevelNo: GameState.player.currentLevelNo,
          isOnGround: GameState.player.isOnGround,
          isSlidding: GameState.player.isSlidding,
          currentSpeedX: GameState.player.currentSpeed.x,
          currentSpeedY: GameState.player.currentSpeed.y,
          sliddingRight: GameState.player.sliddingRight,
          hasFallen: GameState.player.hasFallen,
          jumpTimer: GameState.player.jumpTimer,
        };
        conn.send({ Type: "action", Data: data });
      },
      // send 25 times per second
      40,
    );

    return;
  }

  if ([...GameState.joinedPlayers].every((p) => p.id !== msg.ClientId)) {
    GameState.joinedPlayers.add(new Player(msg.ClientId, pName));
  }
};

// Remove disconnected players
const onSessionQuit = (clientId) => {
  GameState.joinedPlayers.forEach((p) => {
    if (p.id === clientId || !clientId) {
      GameState.joinedPlayers.delete(p);
    }
  });
};

// Update joined players state
const onActionReceive = (msg) => {
  const id = msg.ClientId;
  const data = msg.Data;

  const updatePlayer = [...GameState.joinedPlayers].find((p) => p.id === id);
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
  updatePlayer.jumpTimer = data.jumpTimer;
};

const onConnected = (conn) => {
  const sessionId = conn.getSessionId();
  // types: info, connect, disconnect, action, session
  const connectMessage = {
    Type: "connect",
    SessionId: sessionId?.length > 0 ? sessionId : undefined,
    Data: {
      SessionType: sessionId?.length > 0 ? "connect" : "create",
      PlayerName: GameState.playerName,
    },
  };
  conn.send(connectMessage);
};

const onMessage = (message) => {
  const chat = GameState.chat;

  if (!chat || message.Type === "action") {
    return;
  }

  if (["connect", "disconnect"].includes(message.Type)) {
    const name =
      message.Data?.PlayerName ??
      [...GameState.joinedPlayers].find((p) => p.id === message.ClientId)
        .playerName;

    chat.appendMessage(message.Type, `${name} ${message.Type}ed`);
  }

  const senderName = message.Data?.SenderName;
  if (message.Type === "message" && senderName && senderName.length !== 0) {
    chat.appendMessage("message", message.Data.Message, senderName);
  }
};

const onMessageSend = (message) => {
  const data = {
    Type: "message",
    Data: {
      SenderName: GameState.playerName,
      Message: message,
    },
  };

  GameState.connection.send(data);
};

const events = {
  onConnected,
  onSessionJoin,
  onSessionQuit,
  onActionReceive,
  onMessage,
  onMessageSend,
};

export { events };
