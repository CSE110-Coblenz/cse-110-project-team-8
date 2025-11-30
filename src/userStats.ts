// Single Responsibility: data rendering, persistence is handled by progressStore.ts
// Testability: function is small and isolated

import { getCurrentLevelName, loadProgress, getMinigameScore } from "./progressStore.js";

export function renderUserStats(): void {
  const progress = loadProgress();
  const totalScore = progress.levels.reduce((sum, level) => sum + level.score, 0);
  const highestLevel = getCurrentLevelName() ?? "0";
  const simonSaysScore = getMinigameScore("simon-says");

  const userScore = document.getElementById("userScore");
  const userLevels = document.getElementById("userLevels");
  const userWelcome = document.getElementById("userWelcome");
  const userMinigame = document.getElementById("userMinigame");

  if (userScore) userScore.textContent = `Score: ${totalScore.toLocaleString()}`;
  if (userLevels) userLevels.textContent = `Highest Level: ${highestLevel}`;
  if (userMinigame) userMinigame.textContent = `Highest Minigame Level: ${simonSaysScore}`;
  if (userWelcome) userWelcome.textContent = "Welcome Back, Player!";
}
