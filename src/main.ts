import { initHomepage } from "./homepage.js";
import { Level } from "./level.js";
import { LevelSelect } from "./LevelSelect.js";
import { Player } from "./player.js";

let currentLevel: Level | null = null;
let levelSelect: LevelSelect | null = null;
let currentPlayer: Player | null = null;

function startLevel(level: Level) {
  // Level is already instantiated, just start the GUI
  currentLevel = level;
  currentLevel.start();
}

async function showLevelSelect() {
  // Create a default player if none exists
  if (!currentPlayer) {
    currentPlayer = new Player({ rank: 0, name: "Guest", score: 0 });
  }
  
  levelSelect = new LevelSelect(startLevel, currentPlayer);
  await levelSelect.start();
}

// Initialize homepage on load
document.addEventListener("DOMContentLoaded", () => {
  initHomepage();
  
  // Override the mainPlayBtn to show level select
  const mainPlayBtn = document.getElementById("mainPlayBtn");
  if (mainPlayBtn) {
    mainPlayBtn.addEventListener("click", showLevelSelect);
  }
});
