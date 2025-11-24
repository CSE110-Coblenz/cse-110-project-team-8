import { initHomepage } from "./homepage.js";
import Konva from "konva";
import VimGrid from "./VimGrid.js";
import { GridView } from "./GridView.js";
import { DualGridView } from "./DualGridView.js";
import { VimController } from "./VimController.js";
import { LevelResult, ResultScreen } from "./resultScreen.js";
import { getLevelResult, saveLevelResult, loadProgress, getCurrentLevelName, setCurrentLevelName } from "./progressStore.js";
import { Level } from "./level.js";
import { PauseOverlay, PauseData } from "./pauseOverlay.js";

let stage: Konva.Stage | null = null;
let gameInitialized = false;
let controller: VimController | null = null;
let dualView: DualGridView | null = null;
let leftView : GridView | null = null;
let rightView : GridView | null = null;
let leftGrid: VimGrid | null = null;
let rightGrid: VimGrid | null = null;
let resultScreen: ResultScreen | undefined;
let gameRoot: HTMLElement | null = null;
let levelStartTime = 0;
let levelElapsedActive = 0;
let gamePaused = false;
let pauseOverlay: PauseOverlay | undefined;
let gameHistoryEntryActive = false;
let suppressNextPopstate = false;

const DEFAULT_LEVEL_NUMBER = 1;

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === "F9" && gameInitialized) {
    event.preventDefault();
    togglePause();
    return;
  }

  if (gamePaused || resultScreen?.isVisible()) return;
  if (!controller || !leftView || !leftGrid) return;
  
  // Prevent default browser behavior for vim keys
  event.preventDefault();
  
  controller.handleInput(event);
  
  // Update the view after handling input
  leftView.update(leftGrid);
  dualView?.updateModeLabel();
  const cursor = leftGrid.getCursor();
  leftView.setCursor(cursor.row, cursor.col);
}

function ensureGameVisible() {
  document.body.classList.add("game-active");
  gameRoot?.classList.add("active");
}

function hideGameView() {
  document.body.classList.remove("game-active");
  gameRoot?.classList.remove("active");
  if (gamePaused) {
    setPauseState(false);
  } else {
    pauseOverlay?.hide();
  }
}

function exitToHome() {
  hideGameView();
  if (gameHistoryEntryActive) {
    suppressNextPopstate = true;
    history.back();
  }
}

function accumulateElapsedTime() {
  levelElapsedActive += Math.max(0, performance.now() - levelStartTime);
}

function getLevelElapsedTime() {
  if (!gameInitialized) return 0;
  if (gamePaused) {
    return levelElapsedActive;
  }
  return levelElapsedActive + Math.max(0, performance.now() - levelStartTime);
}

function setPauseState(paused: boolean) {
  if (paused === gamePaused) return;
  if (paused) {
    accumulateElapsedTime();
  } else {
    levelStartTime = performance.now();
  }
  gamePaused = paused;
  document.body.classList.toggle("game-paused", paused);
  if (paused) {
    const pauseData: PauseData = {
      levelName: getActiveLevelDisplay(),
      score: computeScoreFromGrids() ?? 0,
      timeMs: getLevelElapsedTime(),
    };
    pauseOverlay?.show(pauseData, {
      onResume: () => setPauseState(false),
      onExit: () => {
        pauseOverlay?.hide();
        setPauseState(false);
        exitToHome();
      },
    });
  } else {
    pauseOverlay?.hide();
  }
}

function togglePause() {
  setPauseState(!gamePaused);
}

type CompleteOptions = { skipSave?: boolean };

function computeScoreFromGrids(): number | undefined {
  if (!leftGrid || !rightGrid) return undefined;
  return Level.score(rightGrid, leftGrid);
}

function handleLevelComplete(result: LevelResult, options?: CompleteOptions) {
  if (!resultScreen) return;
  setPauseState(false);
  const elapsed = getLevelElapsedTime();
  const computedScore = computeScoreFromGrids();
  const resolved: LevelResult = {
    ...result,
    levelName: result.levelName || getActiveLevelDisplay(),
    score: computedScore ?? result.score,
    timeMs: result.timeMs > 0 ? result.timeMs : elapsed,
  };
  let persisted = resolved;

  if (!options?.skipSave) {
    persisted = saveLevelResult(resolved);
    setCurrentLevelName(persisted.levelName);
    loadProgress(); // ensure local cache stays in sync for future reads
  }

  resultScreen.show(persisted, {
    onContinue: () => {
      resultScreen?.hide();
      ensureGameVisible();
      levelStartTime = performance.now();
      levelElapsedActive = 0;
    },
    onExit: () => {
      resultScreen?.hide();
      exitToHome();
    },
  });
}

function startGame() {
  // Hide homepage UI
  document.body.classList.add("game-active");
  
  // Show game container
  gameRoot = gameRoot ?? document.getElementById("game-root");
  if (!gameRoot) return;
  gameRoot.classList.add("active");
  setPauseState(false);
  setCurrentLevelName(getActiveLevelName());
  levelElapsedActive = 0;
  pushGameHistoryEntry();

  const viewWidth = window.innerWidth / 2;
  const viewHeight = window.innerHeight;

  // Initialize Konva stage if not already done
  if (!gameInitialized) {
    stage = new Konva.Stage({
      container: "game-root",
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Create your VimGrid (model)
    leftGrid = VimGrid.createGridFromText([
      "function hello() {",
      "  console.log('vim rhythm!')",
      "}",
      "",
      ":wq",
    ]);
    
    rightGrid = VimGrid.createGridFromText([
      "test",
    ]);

    // Create the controller
    controller = new VimController(leftGrid);

    // Create the view 
    leftView = new GridView(leftGrid, viewWidth, viewHeight);
    rightView = new GridView(rightGrid, viewWidth, viewHeight);
    dualView = new DualGridView(leftView, rightView, viewWidth, viewHeight);

    layer.add(dualView.getGroup());
    
    // Set initial cursor position
    const cursor = leftGrid.getCursor();
    leftView.setCursor(cursor.row, cursor.col);
    layer.draw();

    // Set up keyboard event listener
    window.addEventListener("keydown", handleKeyPress);
    gameInitialized = true;
  }

  levelStartTime = performance.now();
  setCurrentLevelName(getActiveLevelName());
  levelElapsedActive = 0;
}

// Initialize homepage on load
document.addEventListener("DOMContentLoaded", () => {
  resultScreen = new ResultScreen();
  pauseOverlay = new PauseOverlay();
  initHomepage();
  loadProgress();
  
  // Override the mainPlayBtn to start the game
  const mainPlayBtn = document.getElementById("mainPlayBtn");
  if (mainPlayBtn) {
    mainPlayBtn.addEventListener("click", startGame);
  }

  const playBtn = document.getElementById("playBtn");
  if (playBtn) {
    playBtn.addEventListener("click", startGame);
  }
  
  // Also handle window resize
  window.addEventListener("resize", () => {
    if (stage) {
      stage.width(window.innerWidth);
      stage.height(window.innerHeight);
      dualView?.updateLayout(window.innerWidth / 2, window.innerHeight);
    }
  });

  document.addEventListener("vimbeat:level-complete", (event) => {
    const customEvent = event as CustomEvent<LevelResult>;
    if (!customEvent.detail) return;
    handleLevelComplete(customEvent.detail);
  });

  window.addEventListener("popstate", () => {
    if (suppressNextPopstate) {
      suppressNextPopstate = false;
      gameHistoryEntryActive = false;
      return;
    }
    if (gameHistoryEntryActive) {
      gameHistoryEntryActive = false;
      hideGameView();
    }
  });
});
function getActiveLevelDisplay(): string {
  const fromStorage = getCurrentLevelName();
  if (fromStorage) return fromStorage;
  return `${DEFAULT_LEVEL_NUMBER}`;
}

function getActiveLevelName(): string {
  return getActiveLevelDisplay();
}

function pushGameHistoryEntry() {
  if (gameHistoryEntryActive) return;
  history.pushState({ vimbeatGame: true }, "", window.location.href);
  gameHistoryEntryActive = true;
}
