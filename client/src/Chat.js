import { GameState } from "./constants";

class Chat {
  container = null;
  messageContainer = null;
  input = null;
  messages = null;
  isOpened = false;

  openHeight = "320px";
  closeHeight = "36px";

  constructor({ onSend }) {
    this.container = this.createContainer();
    const msgContainer = this.createMessageContainer();
    this.messageContainer = msgContainer;
    this.container.appendChild(msgContainer);
    const input = this.createInput();
    this.input = input;
    this.container.appendChild(input);
    this.messages = new Set();

    this.onSend = onSend;
  }

  createInput() {
    const input = document.createElement("input");
    input.style.width = "100%";
    input.style.height = "40px";
    input.hidden = true;

    input.addEventListener("keyup", ({ key }) => {
      if (key === "Enter") {
        this.sendMessage();
      }

      if (key === "Escape") {
        this.openClose();
      }
    });

    return input;
  }

  createMessageContainer() {
    const messageContainer = document.createElement("div");
    messageContainer.style.display = "flex";
    messageContainer.style.flexDirection = "column";
    messageContainer.style.gap = "4px";
    messageContainer.style.justifyContent = "flex-end";
    messageContainer.style.alignItems = "flex-start";
    messageContainer.style.width = "100%";
    messageContainer.style.height = "100%";

    return messageContainer;
  }

  createContainer() {
    const chatContainer = document.createElement("div");
    chatContainer.style.position = "absolute";
    chatContainer.style.top = "0";
    chatContainer.style.right = "0";
    chatContainer.style.background = "oklch(0.216 0.006 56.043)";
    chatContainer.style.opacity = 0.95;
    chatContainer.style.border = "1px solid oklch(0.147 0.004 49.25)";
    chatContainer.style.width = "320px";
    chatContainer.style.height = this.closeHeight;
    chatContainer.style.display = "flex";
    chatContainer.style.padding = "10px";
    chatContainer.style.flexDirection = "column";
    chatContainer.style.justifyContent = "flex-end";
    chatContainer.style.gap = "4px";
    chatContainer.style.overflow = "auto";
    chatContainer.style.fontSize = "20px";
    chatContainer.style.color = "white";
    chatContainer.style.fontFamily = "ttf_alkhemikal";
    document.getElementById("canvas-container").appendChild(chatContainer);

    return chatContainer;
  }

  addMessageElement(node) {
    this.messageContainer.appendChild(node);
  }

  openClose() {
    const isOpen = !this.isOpened;
    this.isOpened = isOpen;
    this.container.style.height = this.isOpened
      ? this.openHeight
      : this.closeHeight;

    if (isOpen) {
      this.input.hidden = false;
      this.input.focus();
    } else {
      this.input.hidden = true;
      this.input.blur();
      this.input.value = "";
    }

    return isOpen;
  }

  appendMessage(type, message, name) {
    // this.messages.add(message);
    const messageElement = document.createElement("p");
    messageElement.style.margin = "0";

    if (type !== "message") {
      messageElement.textContent = `[${message}]`;
      messageElement.style.color = (() => {
        if (type === "connect") {
          return "oklch(0.723 0.219 149.579)";
        }

        if (type === "disconnect") {
          return "oklch(0.577 0.245 27.325)";
        }

        return "white";
      })();
      this.addMessageElement(messageElement);
      return;
    }

    const nameElement = document.createElement("span");
    nameElement.textContent = `${name}:`;
    const nameColor =
      name === GameState.player.playerName
        ? "oklch(0.852 0.199 91.936)"
        : "oklch(0.496 0.265 301.924)";
    nameElement.style.color = nameColor;

    const messageContainer = document.createElement("div");
    messageContainer.style.display = "flex";
    messageContainer.style.gap = "4px";
    messageContainer.style.alignItems = "center";
    messageElement.textContent = message;

    messageContainer.appendChild(nameElement);
    messageContainer.appendChild(messageElement);

    this.addMessageElement(messageContainer);
    this.container.scrollTop = this.container.scrollHeight;
  }

  sendMessage() {
    const inputValue = this.input.value.slice(0, 32);
    if (!inputValue || inputValue.length === 0) {
      return;
    }

    this.onSend?.(inputValue);
    this.openClose();
  }
}
export { Chat };
