import { initHomepage } from "./Homepage.js";
import Konva from "konva";
import VimGrid from "./VimGrid.js";
import { GridView } from "./GridView.js";
import { DualGridView } from "./DualGridView.js";
import { VimController } from "./VimController.js";

let stage: Konva.Stage | null = null;
let gameInitialized = false;
let controller: VimController | null = null;
let dualView: DualGridView | null = null;
let leftView : GridView | null = null;
let rightView : GridView | null = null;
let leftGrid: VimGrid | null = null;
let rightGrid: VimGrid | null = null;

const HALF_VIEW_WIDTH = window.innerWidth / 2;

function handleKeyPress(event: KeyboardEvent) {
  if (!controller || !leftView || !leftGrid) return;
  
  // Prevent default browser behavior for vim keys
  event.preventDefault();
  
  controller.handleInput(event);
  
  // Update the view after handling input
  leftView.update(leftGrid);
  dualView?.updateModeLabel();
  const cursor = leftGrid.getCursor();
  leftView.setCursor(cursor.row, cursor.col);
}

function startGame() {
  // Hide homepage UI
  document.body.classList.add("game-active");
  
  // Show game container
  const gameRoot = document.getElementById("game-root");
  if (!gameRoot) return;
  gameRoot.classList.add("active");

  // Initialize Konva stage if not already done
  if (!gameInitialized) {
    stage = new Konva.Stage({
      container: "game-root",
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Create your VimGrid (model)
    leftGrid = VimGrid.createGridFromText([
      "function hello() {",
      "  console.log('vim rhythm!')",
      "}",
      "",
      ":wq",
    ]);
    
    rightGrid = VimGrid.createGridFromText([
      "test",
    ]);

    // Create the controller
    controller = new VimController(leftGrid);

    // Create the view (VimGridView)
    leftView = new GridView(leftGrid, 0);
    rightView = new GridView(rightGrid, HALF_VIEW_WIDTH);
    dualView = new DualGridView(leftView, rightView);

    layer.add(dualView.getGroup());
    
    // Set initial cursor position
    const cursor = leftGrid.getCursor();
    leftView.setCursor(cursor.row, cursor.col);
    layer.draw();

    // Set up keyboard event listener
    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("keydown", handleKeyPress);
    gameInitialized = true;
  }
}

// Initialize homepage on load
document.addEventListener("DOMContentLoaded", () => {
  initHomepage();
  
  // Override the mainPlayBtn to start the game
  const mainPlayBtn = document.getElementById("mainPlayBtn");
  if (mainPlayBtn) {
    mainPlayBtn.addEventListener("click", startGame);
  }
  
  // Also handle window resize
  window.addEventListener("resize", () => {
    if (stage) {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
    }
  });
});
