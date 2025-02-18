import { Constants } from "./constants.js";

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
    if (Constants.showingLines) {
      for (let l of Constants.lines) {
        l.Show();
      }
    }
    if (Constants.showingCoins) {
      for (let c of this.coins) {
        c.show();
      }
    }

    window.pop();
  }
}

export { Level };
