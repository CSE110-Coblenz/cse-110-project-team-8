import { saveLevelResult, setCurrentLevelName } from "../src/progressStore.js";
import { renderUserStats } from "../src/userStats.js";
import type { LevelResult } from "../src/resultScreen.js";

describe("user stats rendering", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="userScore"></div>
      <div id="userLevels"></div>
      <div id="userWelcome"></div>
    `;
  });

  function completeLevel(levelName: string, score: number) {
    const result: LevelResult = {
      levelName,
      score,
      timeMs: 120000,
    };
    saveLevelResult(result);
  }

  it("shows aggregated score and numeric level count after completing levels", () => {
    completeLevel("Tutorial Groove", 800);
    completeLevel("Next Beat", 1200);
    setCurrentLevelName("Next Beat");

    renderUserStats();

    expect(document.getElementById("userScore")?.textContent).toBe("Score: 2,000");
    expect(document.getElementById("userLevels")?.textContent).toBe("Level: 2");
    expect(document.getElementById("userWelcome")?.textContent).toBe("Welcome Back, Player!");
  });
});
