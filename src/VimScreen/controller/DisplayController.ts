import VimGrid from "../model/VimGrid";
import { GridView } from "../view/GridView";

export default class DisplayController {
  private blinkTimer?: number;
  private blinkOn = true;

  constructor(
    private grid: VimGrid,
    private view: GridView,
    private cursor = { row: 0, col: 0 }
  ) {
    // initial paint
    this.view.update(this.grid);
    this.view.setCursor(this.cursor.row, this.cursor.col);
  }

  /** Movement (clamped) */
  moveCursorBy(dr: number, dc: number) {
    const r = Math.max(0, Math.min(this.grid.numRows - 1, this.cursor.row + dr));
    const c = Math.max(0, Math.min(this.grid.numCols - 1, this.cursor.col + dc));
    this.cursor = { row: r, col: c };
    this.view.setCursor(r, c);
  }

  moveCursorTo(r: number, c: number) {
    const nr = Math.max(0, Math.min(this.grid.numRows - 1, r));
    const nc = Math.max(0, Math.min(this.grid.numCols - 1, c));
    this.cursor = { row: nr, col: nc };
    this.view.setCursor(nr, nc);
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

  /** Expose cursor (if needed elsewhere) */
  getCursor() { return { ...this.cursor }; }
}
