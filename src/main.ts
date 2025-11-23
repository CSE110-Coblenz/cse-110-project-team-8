import { initHomepage } from "./homepage.js";
import { Level } from "./level.js";

let currentLevel: Level | null = null;

async function startGame() {
  // Load level from file
  if (!currentLevel) {
    try {
      currentLevel = await Level.fromFile("/src/testlevel.json");
    } catch (error) {
      console.error("Failed to load level:", error);
      // Fallback to empty level if file loading fails
      currentLevel = new Level({ keyframes: [] });
    }
  }
  currentLevel.start();
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
    console.log("Resize event triggered!");
    if (stage && dualView) {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);

      // Update dual view to resize both grids
      dualView.resize(window.innerWidth, window.innerHeight);
    }
  });
});
