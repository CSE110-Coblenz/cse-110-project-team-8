import VimGrid from "./VimGrid";
import type { Cell } from "./VimGrid";

class VimModel {
  buffer: string[] = [""];
  cursor = { row: 0, col: 0 };
  mode: "normal" | "insert" = "normal";
  

  insertText(char: string) {
    const line = this.buffer[this.cursor.row];
    this.buffer[this.cursor.row] = line.slice(0, this.cursor.col) + char + line.slice(this.cursor.col);
    this.cursor.col++;
  }
  deleteText() {
    const {row, col} = this.cursor;
    const line = this.buffer[row];
    
    if(col === 0) return;

    this.buffer[row] = line.slice(0, this.cursor.col - 1) + line.slice(col);
    this.cursor.col -= 1;
  }
  moveCursorBy(dr: number, dc: number): void {
    const r = Math.max(0, Math.min(this.numRows - 1, this.cursor.row + dr));
    const c = Math.max(0, Math.min(this.numCols - 1, this.cursor.col + dc));
    this.cursor = { row: r, col: c };
  }
}
