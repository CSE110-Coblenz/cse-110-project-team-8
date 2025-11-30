import { ResultScreen, LevelResult } from "../src/resultScreen.js";
import { renderUserStats } from "../src/userStats.js";
import { saveLevelResult, setCurrentLevelName } from "../src/progressStore.js";

describe("level completion updates UI", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <div id="userWelcome"></div>
      <div id="userScore"></div>
      <div id="userLevels"></div>
    `;
  });

  it("updates result overlay and homepage stats after saving a level", () => {
    const resultScreen = new ResultScreen();
    const result: LevelResult = {
      levelName: "Level 3: Test Level",
      score: 2450,
      timeMs: 123000,
    };

    resultScreen.show(result);

    expect(
      document.getElementById("result-score-value")?.textContent
    ).toBe("2,450");
    expect(
      document.getElementById("result-level-name")?.textContent
    ).toBe("Level 3: Test Level");

    saveLevelResult(result);
    setCurrentLevelName(result.levelName);

    renderUserStats();

    expect(
      document.getElementById("userScore")?.textContent
    ).toBe("Score: 2,450");
    expect(
      document.getElementById("userLevels")?.textContent
    ).toBe("Highest Level: 3");
  });
});
