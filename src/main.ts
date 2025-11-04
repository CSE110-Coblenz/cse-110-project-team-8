import Konva from "konva";
import VimGrid from "./VimScreen/model/VimGrid";
import { GridView } from "./VimScreen/view/GridView"; // adjust path if different

// Fullscreen Konva stage
const stage = new Konva.Stage({
  container: "root",
  width: window.innerWidth,
  height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

// Create your VimGrid (model)
const grid = VimGrid.createGridFromText([
  "function hello() {",
  "  console.log('vim rhythm!')",
  "}",
  "",
  ":wq",
]);

// Create the view (VimGridView)
const view = new GridView(grid);
layer.add(view.getGroup());
layer.draw();

// Animate cursor movement for demo
let row = 0, col = 0;
setInterval(() => {
  view.setCursor(row, col);
  col = (col + 1) % grid.numCols;
  if (col === 0) row = (row + 1) % grid.numRows;
}, 250);
