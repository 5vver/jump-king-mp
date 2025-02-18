class Coin {
  constructor(x, y, type = "reward") {
    this.levelNo = 0;
    this.x = x;
    this.y = y;
    this.radius = 50;
    this.type = type;
  }

  collidesWithPlayer(playerToCheck) {
    let playerMidPoint = playerToCheck.currentPos.copy();
    playerMidPoint.x += playerToCheck.width / 2;
    playerMidPoint.y += playerToCheck.height / 2;
    if (
      window.dist(playerMidPoint.x, playerMidPoint.y, this.x, this.y) <
      this.radius + playerToCheck.width / 2
    ) {
      return true;
    }
    return false;
  }

  show() {
    window.push();
    if (this.type == "reward") {
      window.fill(255, 150, 0);
    } else {
      window.fill(0, 200, 0, 100);
    }
    window.noStroke();
    window.ellipse(this.x, this.y, this.radius * 2);
    window.pop();
  }
}

export { Coin };

