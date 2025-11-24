import { renderUserStats } from "./userStats.js";
import { initResetButton } from "./resetGame.js";

document.addEventListener("DOMContentLoaded", () => {
  renderUserStats();
  initResetButton(() => renderUserStats());
});
