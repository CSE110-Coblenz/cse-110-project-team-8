import VimGrid from "./VimGrid.js";
import { GridView } from "./GridView.js";

export default class DisplayController {
  private blinkTimer?: number;
  private blinkOn = true;

  constructor(
    private grid: VimGrid,
    private view: GridView
  ) {
    // initial paint
    this.view.update(this.grid);
    const cursor = this.grid.getCursor();
    this.view.setCursor(cursor.row, cursor.col);
  }

  moveCursorBy(dr: number, dc: number) {
    this.grid.moveCursorBy(dr, dc);
    const cursor = this.grid.getCursor();
    this.view.setCursor(cursor.row, cursor.col);
  }

  moveCursorTo(r: number, c: number) {
    this.grid.setCursor(r, c);
    const cursor = this.grid.getCursor();
    this.view.setCursor(cursor.row, cursor.col);
  }

  /** Blink lifecycle */
  startBlink(intervalMs = 500) {
    this.stopBlink();
    this.blinkOn = true;
    this.view.setCursorVisible(true);
    this.blinkTimer = window.setInterval(() => {
      this.blinkOn = !this.blinkOn;
      this.view.setCursorVisible(this.blinkOn);
    }, intervalMs);
  }

  stopBlink() {
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = undefined;
    }
    this.view.setCursorVisible(true);
  }

  /** Redraw the grid after model changes */
  refresh() {
    this.view.update(this.grid);
  }

  getCursor() { return this.grid.getCursor(); }
}

