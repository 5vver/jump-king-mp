import { GameState } from "./constants.js";

class Level {
  constructor() {
    this.levelImage = null;
    this.lines = [];
    this.levelNo = 0;
    this.isBlizzardLevel = false;
    this.isIceLevel = false;
    this.coins = [];
    this.hasProgressionCoins = false;
  }

  show() {
    window.push();
    window.image(this.levelImage, 0, 0);
    if (GameState.showingLines) {
      for (let l of GameState.lines) {
        l.Show();
      }
    }
    if (GameState.showingCoins) {
      for (let c of this.coins) {
        c.show();
      }
    }

    window.pop();
  }
}

export { Level };
