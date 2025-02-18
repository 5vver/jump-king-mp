function createModal(onClick) {
  let inputValue = "";

  const modalContainer = document.createElement("div");
  const input = document.createElement("input");
  const button = document.createElement("button");
  const text = document.createElement("p");

  modalContainer.style.position = "absolute";
  modalContainer.style.width = "250px";
  modalContainer.style.height = "120px";
  modalContainer.style.inset = 0;
  modalContainer.style.marginLeft = "calc(50% - 120px)";
  modalContainer.style.marginTop = "calc(320px)";
  modalContainer.style.display = "flex";
  modalContainer.style.flexWrap = "wrap";

  modalContainer.appendChild(text);
  modalContainer.appendChild(input);
  modalContainer.appendChild(button);

  const hide = () => {
    document.body.removeChild(modalContainer);
  };

  input.onchange = (event) => {
    inputValue = event.target.value;
  };
  input.maxLength = 12;

  button.onclick = (event) => {
    onClick?.(inputValue, hide);
  };

  input.style.fontSize = "18px";
  button.textContent = "enter";
  text.textContent = "Enter your name";
  text.style.color = "white";
  text.style.fontFamily = "ttf_alkhemikal";
  text.style.fontSize = "40px";
  text.style.margin = 0;

  document.body.appendChild(modalContainer);
}

const getSessionId = () =>
  new URL(window.location.href).pathname.match(/[^\/]+/g)?.[0];

function createChatWindow() {
  const chatContainer = document.createElement("div");
  const input = document.createElement("input");
  const button = document.createElement("button");
  const text = document.createElement("p");

  // style
  chatContainer.style.display = "flex";
  chatContainer.style.flexDirection = "column";
  chatContainer.style.gap = "8px";
  chatContainer.style.position = "absolute";
  chatContainer.style.top = 0;
  chatContainer.style.right = 0;
  chatContainer.style.background = "red";
  chatContainer.style.width = "320px";
  chatContainer.style.height = "120px";

  document.body.appendChild(chatContainer);
}

export { createModal, createChatWindow, getSessionId };
