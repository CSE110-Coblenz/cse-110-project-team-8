import { initHomepage } from "./Homepage.js";
import Konva from "konva";
import VimGrid from "./VimGrid.js";
import { GridView } from "./GridView.js";
import { VimController } from "./VimController.js";
import { loadProgress } from "./progress.js";

let stage: Konva.Stage | null = null;
let gameInitialized = false;
let controller: VimController | null = null;
let view: GridView | null = null;
let grid: VimGrid | null = null;
let progress = loadProgress();
console.log("Loaded progress:", progress);

function handleKeyPress(event: KeyboardEvent) {
  if (!controller || !view || !grid) return;
  
  // Prevent default browser behavior for vim keys
  event.preventDefault();
  
  controller.handleInput(event);
  
  // Update the view after handling input
  view.update(grid);
  const cursor = grid.getCursor();
  view.setCursor(cursor.row, cursor.col);
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
    grid = VimGrid.createGridFromText([
      "function hello() {",
      "  console.log('vim rhythm!')",
      "}",
      "",
      ":wq",
    ]);

    // Create the controller
    controller = new VimController(grid);

    // Create the view (VimGridView)
    view = new GridView(grid);
    layer.add(view.getGroup());
    
    // Set initial cursor position
    const cursor = grid.getCursor();
    view.setCursor(cursor.row, cursor.col);
    layer.draw();

    // Set up keyboard event listener
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

import { updateProgress } from "./progress.js";
// TODO: Call onLevelCompleted(levelId, levelScore)
// when the player finishes a level and Level.score() is calculated.
function onLevelCompleted(levelId: string, levelScore: number) {
  updateProgress((current) => {
    const completed = new Set(current.completedLevels);
    completed.add(levelId);

    return {
      ...current,
      completedLevels: Array.from(completed),
      bestScore: Math.max(current.bestScore, levelScore),
      lastOpenLevelId: levelId,
    };
  });

  console.log("Progress saved for", levelId);
}