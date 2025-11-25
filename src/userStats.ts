// Single Responsibility: data rendering, persistence is handled by progressStore.ts
// Testability: function is small and isolated

import { getCurrentLevelName, loadProgress } from "./progressStore.js";

export function renderUserStats(): void {
  const progress = loadProgress();
  const highestCompleted =
    progress.levels.length > 0
      ? progress.levels[progress.levels.length - 1].levelName
      : null;
  const storedLevel = getCurrentLevelName();
  const levelDisplay =
    storedLevel ??
    highestCompleted ??
    (progress.levels.length > 0 ? String(progress.levels.length) : "1");
  const totalScore = progress.levels.reduce((sum, level) => sum + level.score, 0);

  const userScore = document.getElementById("userScore");
  const userLevels = document.getElementById("userLevels");
  const userWelcome = document.getElementById("userWelcome");

  if (userScore) userScore.textContent = `Score: ${totalScore.toLocaleString()}`;
  if (userLevels) userLevels.textContent = `Level: ${levelDisplay}`;
  if (userWelcome) userWelcome.textContent = "Welcome Back, Player!";
}
