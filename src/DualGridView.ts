import Konva from "konva";
import VimGrid from "./VimGrid.js";
import { GridView } from "./GridView.js";

export function createVimStage(containerId = "root") {
  const VIEW_WIDTH = window.innerWidth / 2;
  const VIEW_HEIGHT = window.innerHeight;

  const stage = new Konva.Stage({
    container: containerId,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const layer = new Konva.Layer();
  stage.add(layer);

  // --- Create your VimGrid (model) ---
  const grid1 = VimGrid.createGridFromText([
    "function hello() {",
    "  console.log('vim rhythm!')",
    "}",
    "",
    ":wq",
  ]);

   const grid2 = VimGrid.createGridFromText([
    "function hello() {",
    "  console.log('vim rhythm!')",
    "}",
    "",
    ":wq",
  ]);

  // --- Create left and right views ---
  const view1 = new GridView(grid1);
  layer.add(view1.getGroup());

  const view2 = new GridView(grid2);
  view2.getGroup().x(VIEW_WIDTH);
  layer.add(view2.getGroup());

  layer.draw();

  // --- Demo animation ---
  let row = 0, col = 0;
  setInterval(() => {
    view1.setCursor(row, col);
    col = (col + 1) % grid1.numCols;
    if (col === 0) row = (row + 1) % grid1.numRows;
  }, 250);

  return { stage, layer, grid1, grid2, view1, view2 };
}