// import { v4 as uuid4 } from "uuid";

class ClientConnection {
  #wsConnection = null;
  #clientId = null;

  constructor() {
    if (!this.#wsConnection) {
      this.#wsConnection = new WebSocket("ws://localhost:8000/ws");
    }

    // this.#clientId = uuid4();
    this.init();
  }

  init() {
    const ws = this.#wsConnection;

    if (!ws) {
      throw new Error("no ws connection");
    }

    ws.onopen = () => {
      console.log("connected to server");
      ws.send(`User connected - ${this.#clientId}`);
    };
    ws.onclose = () => {
      console.log("Disconnected from server");
    };
    ws.onerror = (error) => {
      console.log(`ws error: ${error}`);
    };
  }
}
