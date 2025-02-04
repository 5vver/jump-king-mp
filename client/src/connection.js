const getRandomId = () =>
  new Date().getTime().toString(36) + Math.random().toString(36).slice(2);

class ClientConnection {
  #wsConnection = null;
  #clientId = null;
  #sessionId = null;
  connected = false;

  constructor({
    onSessionJoin,
    onSessionQuit,
    onConnected,
    onDisconnected,
    onActionReceive,
  } = {}) {
    if (!this.#wsConnection) {
      this.#wsConnection = new WebSocket(import.meta.env.VITE_WS_URL);
    }

    // this.#clientId = getRandomId();

    this.onConnected = onConnected;
    this.onSessionJoin = onSessionJoin;
    this.onSessionQuit = onSessionQuit;
    this.onActionReceive = onActionReceive;

    this.init();
  }

  init() {
    const conn = this.#wsConnection;

    if (!conn) {
      throw new Error("no ws connection");
    }

    conn.onopen = () => {
      console.log("connected to server");
      this.connected = true;
      this.onConnected?.(this);
    };
    conn.onclose = () => {
      this.connected = false;
      this.#clientId = null;
      this.#wsConnection = null;
      console.log("Disconnected from server");
      this.onSessionQuit?.();
    };
    conn.onerror = (error) => {
      this.connected = false;
      console.log(`ws error: ${error}`);
    };
    conn.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.Type === "action") {
        onActionReceive?.(msg);
        return;
      }
      console.log("Message: ");
      console.log(msg);

      if (msg.Type === "connect") {
        this.#sessionId = msg.SessionId;
        const type = !this.#clientId ? "start" : "new";
        if (type === "start" && msg.ClientId) {
          this.#clientId = msg.ClientId;
        } else if (this.#clientId === msg.ClientId) {
          return;
        }

        this.onSessionJoin?.(this, type, msg);
      }

      if (msg.Type === "disconnect" && msg.ClientId !== this.#clientId) {
        this.onSessionQuit?.(msg.ClientId);
      }
    };
  }

  reconnect() {
    const conn = this.#wsConnection;
    if (conn) {
      conn.close();
    }
    conn = new WebSocket(socketUrl);
    this.init();
  }

  send(data) {
    if (!this.connected) {
      return;
    }

    if (typeof data !== "object" || Object.keys(data).length < 0) {
      throw new Error("Incorrect message data provided");
    }

    this.#wsConnection.send(
      JSON.stringify({
        ...data,
        ClientId: data?.ClientId ?? this.#clientId,
        SessionId: data?.SessionId ?? this.#sessionId,
        Type: data.Type ?? "info",
      }),
    );
  }

  getClientId() {
    return this.#clientId;
  }

  getSessionId() {
    return this.#sessionId;
  }

  getIsConnected() {
    return this.connected;
  }
}

// workaround for non module js files
window.ClientConnection = ClientConnection;
