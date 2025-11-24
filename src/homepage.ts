import { renderUserStats } from "./userStats.js";
import { initResetButton } from "./resetGame.js";

function setupInteractions() {
  document.getElementById("aboutBtn")?.addEventListener("click", () => {
    window.location.href = "about.html";
  });
}

export function initHomepage() {
  setupInteractions();
  initResetButton(() => renderUserStats());
  renderUserStats();
}
