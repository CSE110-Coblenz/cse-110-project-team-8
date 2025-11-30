import { initHomepage } from "./homepage.js";
import { LevelResult, ResultScreen } from "./resultScreen.js";
import { loadProgress } from "./progressStore.js";
import { Level } from "./level.js";
import { LevelSelect } from "./LevelSelect.js";
import { Player } from "./player.js";
import { SimonSays } from "./minigames/simonSays.js";
import { renderUserStats } from "./userStats.js";

let currentLevel: Level | null = null;
let levelSelect: LevelSelect | null = null;
let currentPlayer: Player | null = null;
let resultScreen: ResultScreen | undefined;
let simonSaysGame: SimonSays | null = null;

function startLevel(level: Level) {
  // Level is already instantiated, just start the GUI
  currentLevel = level;
  
  // Stop level select when starting a level
  if (levelSelect) {
    levelSelect.stop();
    levelSelect = null;
  }
  
  // Set up completion callback to return to level select
  if (currentLevel) {
    currentLevel.setOnComplete(returnToLevelSelect);
    // Set up exit callback for pause menu
    currentLevel.setOnExit(returnToLevelSelect);
  }
  
  currentLevel.start();
}

function returnToLevelSelect() {
  // Stop current level and save score
  if (currentLevel && currentPlayer) {
    const finalScore = currentLevel.getScore();
    const levelId = currentLevel.getId();
    currentPlayer.setLevelScore(levelId, finalScore);
    console.log(`Level ${levelId} completed with score: ${finalScore}`);
    
    currentLevel.stop();
    currentLevel = null;
  }
  
  // Return to level select
  showLevelSelect();
}

async function showLevelSelect() {
  // Create a default player if none exists
  if (!currentPlayer) {
    currentPlayer = new Player({ rank: 0, name: "Guest", score: 0 });
  }

  // Always create a new level select instance when returning
  // (the previous one was stopped when the level started)
  levelSelect = new LevelSelect(startLevel, currentPlayer);
  await levelSelect.start();
}

function startSimonSays() {
  simonSaysGame = new SimonSays();
  simonSaysGame.setOnExit(() => {
    simonSaysGame = null;
    renderUserStats();
  });
  simonSaysGame.start();
}

// Initialize homepage on load
document.addEventListener("DOMContentLoaded", () => {
  resultScreen = new ResultScreen();
  initHomepage();
  loadProgress();

  // Override the mainPlayBtn to show level select
  const mainPlayBtn = document.getElementById("mainPlayBtn");
  if (mainPlayBtn) {
    mainPlayBtn.addEventListener("click", showLevelSelect);
  }

  // Add minigames button handler
  const minigamesBtn = document.getElementById("minigamesBtn");
  if (minigamesBtn) {
    minigamesBtn.addEventListener("click", startSimonSays);
  }

  document.addEventListener("vimbeat:level-complete", (event) => {
    const customEvent = event as CustomEvent<LevelResult>;
    if (!customEvent.detail) return;
    // Handle level complete event if needed
    console.log("Level complete:", customEvent.detail);
  });
});
