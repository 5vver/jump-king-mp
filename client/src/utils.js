import { v4 as uuidv4 } from "uuid";

function createModal({ title, onClick, onHide, initial, maxLength }) {
  let inputValue = "";

  const modalContainer = document.createElement("div");
  const input = document.createElement("input");
  const button = document.createElement("button");
  const text = document.createElement("p");

  modalContainer.style.position = "absolute";
  modalContainer.style.width = "300px";
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
    onHide?.();
  };

  input.onchange = (event) => {
    inputValue = event.target.value;
  };
  input.maxLength = maxLength ?? 12;
  if (initial) {
    input.value = initial;
    inputValue = initial;
    // delayed select input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }

  button.onclick = (event) => {
    onClick?.(inputValue, hide);
  };

  input.style.fontSize = "18px";
  button.textContent = "enter";
  text.textContent = title ?? "Type in:";
  text.style.color = "white";
  text.style.fontFamily = "ttf_alkhemikal";
  text.style.fontSize = "40px";
  text.style.margin = 0;

  document.body.appendChild(modalContainer);
}

const validateInputValue = (value) =>
  value && typeof value === "string" && value.length > 0;

const generateSessionId = () => uuidv4().slice(0, 5);

export { createModal, validateInputValue, generateSessionId };
