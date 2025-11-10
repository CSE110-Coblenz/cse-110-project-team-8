

export class VimView {
  constructor(private model: VimModel, private grid: VimGrid) {
    render() {
      for(let r = 0; r < this.model.buffer.length; r++) {
        const line = this.model.buffer[r];
        for(let c = 0; c < line.length; c++) {
          this.grid.set(r, c, {ch: line[c]});
        }
      }
      const { row, col } = this.model.cursor;
      this.grid.set(row, col, {ch: this.model.buffer[row][col] ?? " ", hl: "cursor" });
    }
  }
}
