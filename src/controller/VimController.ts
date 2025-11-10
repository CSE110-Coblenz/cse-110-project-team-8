import VimGrid from "./VimGrid";
import type { Cell } from "./VimGrid";

class VimController {
  constructor(private model: EditorModel, private view: EditorView, private grid: VimGrid);

  handleInput(key: String) {
    if this.model.mode === "insert" {
      if(key === "Escape") {
        this.model.mode === "normal";
      } else {
        this.model.insertChar(key);
      }
    } else if (this.model.mode === "normal") {
      if(key === "i") this.model.mode = "insert";
      if(key === "h") this.model.moveCursorBy(0, -1);
      if(key === "j") this.model.moveCursorBy(1, 0);
      if(key === "k") this.model.moveCursorBy(-1, 0);
      if(key === "l") this.model.moveCursorBy(0, 1);
      if(key === "0") this.model.moveCursorBy(0, -grid.numCols);
      if(key === "$") this.model.moveCursorBy(0, grid.numCols);
    }

    this.view.render();
  }
}
