// Single Responsibility: data rendering, persistence is handled by progressStore.ts
// Testability: function is small and isolated

import { getCurrentLevelName, loadProgress } from "./progressStore.js";

export function renderUserStats(): void {
  const progress = loadProgress();
  const totalScore = progress.levels.reduce((sum, level) => sum + level.score, 0);
  const highestLevel = getCurrentLevelName() ?? "0";

  const userScore = document.getElementById("userScore");
  const userLevels = document.getElementById("userLevels");
  const userWelcome = document.getElementById("userWelcome");

  if (userScore) userScore.textContent = `Score: ${totalScore.toLocaleString()}`;
  if (userLevels) userLevels.textContent = `Highest Level: ${highestLevel}`;
  if (userWelcome) userWelcome.textContent = "Welcome Back, Player!";
}
