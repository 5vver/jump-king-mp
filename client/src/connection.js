const getRandomId = () =>
  new Date().getTime().toString(36) + Math.random().toString(36).slice(2);

const socketUrl = "ws://localhost:8000/ws";

class ClientConnection {
  #wsConnection = null;
  #clientId = null;
  connected = false;

  constructor() {
    if (!this.#wsConnection) {
      this.#wsConnection = new WebSocket(socketUrl);
    }

    this.#clientId = getRandomId();
    this.init();
  }

  init() {
    const conn = this.#wsConnection;

    if (!conn) {
      throw new Error("no ws connection");
    }

    conn.onopen = () => {
      console.log("connected to server");
      const connectMessage = {
        // types: info, connect, disconnect, action
        Type: "connect",
        Id: this.#clientId,
        Message: `Player connected - ${this.#clientId}`,
      };
      conn.send(JSON.stringify(connectMessage));
      this.connected = true;
    };
    conn.onclose = () => {
      this.connected = false;
      console.log("Disconnected from server");
    };
    conn.onerror = (error) => {
      this.connected = false;
      console.log(`ws error: ${error}`);
    };
    conn.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("Message: ");
      console.log(msg);
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
        Id: this.#clientId,
        Type: data.Type ?? "info",
      }),
    );
  }
}
