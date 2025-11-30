import { LevelResult } from "./resultScreen.js";

export type StoredLevelResult = LevelResult & { completedAt: number };

export type MinigameScore = {
  name: string;
  highScore: number;
  completedAt: number;
};

const STORAGE_KEY = "vimbeat-progress";
const CURRENT_LEVEL_KEY = "vimbeat-current-level";

type ProgressData = {
  levels: StoredLevelResult[];
  minigames?: MinigameScore[];
};

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function readProgress(): ProgressData {
  const storage = getStorage();
  if (!storage) return { levels: [], minigames: [] };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { levels: [], minigames: [] };
    const parsed = JSON.parse(raw) as ProgressData;
    if (!parsed.levels) return { levels: [], minigames: [] };
    return { levels: parsed.levels, minigames: parsed.minigames || [] };
  } catch {
    return { levels: [], minigames: [] };
  }
}

function writeProgress(data: ProgressData): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {

  }
}

export function loadProgress(): ProgressData {
  return readProgress();
}

export function getCurrentLevelName(): string | null {
  const progress = readProgress();
  if (progress.levels.length === 0) return null;

  // Extract highest completed level number from level names
  const highestLevel = Math.max(...progress.levels.map(level => {
    const match = level.levelName.match(/Level (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }));

  return highestLevel > 0 ? String(highestLevel) : null;
}

export function setCurrentLevelName(name: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CURRENT_LEVEL_KEY, name);
  } catch {

  }
}

export function getLevelResult(levelName: string): StoredLevelResult | undefined {
  const data = readProgress();
  return data.levels.find((level) => level.levelName === levelName);
}

export function saveLevelResult(result: LevelResult): StoredLevelResult {
  const data = readProgress();
  const updated: StoredLevelResult = { ...result, completedAt: Date.now() };
  const existingIndex = data.levels.findIndex((level) => level.levelName === result.levelName);

  if (existingIndex >= 0) {
    const existing = data.levels[existingIndex];
    // Keep the higher score; overwrite the rest when new score wins
    data.levels[existingIndex] =
      updated.score >= existing.score ? updated : existing;
  } else {
    data.levels.push(updated);
  }

  writeProgress(data);
  return getLevelResult(result.levelName) ?? updated;
}

export function getCompletedLevels(): StoredLevelResult[] {
  return readProgress().levels;
}

export function saveMinigameScore(name: string, score: number): void {
  const data = readProgress();
  if (!data.minigames) {
    data.minigames = [];
  }

  const existingIndex = data.minigames.findIndex(mg => mg.name === name);
  const newScore: MinigameScore = {
    name,
    highScore: score,
    completedAt: Date.now()
  };

  if (existingIndex >= 0) {
    const existing = data.minigames[existingIndex];
    // Only update if new score is higher
    if (score > existing.highScore) {
      data.minigames[existingIndex] = newScore;
    }
  } else {
    data.minigames.push(newScore);
  }

  writeProgress(data);
}

export function getMinigameScore(name: string): number {
  const data = readProgress();
  if (!data.minigames) return 0;
  const minigame = data.minigames.find(mg => mg.name === name);
  return minigame ? minigame.highScore : 0;
}

export function resetProgress(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(CURRENT_LEVEL_KEY);
  } catch {

  }
}
