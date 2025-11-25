import { LevelResult } from "./resultScreen.js";

export type StoredLevelResult = LevelResult & { completedAt: number };

const STORAGE_KEY = "vimbeat-progress";
const CURRENT_LEVEL_KEY = "vimbeat-current-level";

type ProgressData = {
  levels: StoredLevelResult[];
};

function getStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

function readProgress(): ProgressData {
  const storage = getStorage();
  if (!storage) return { levels: [] };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { levels: [] };
    const parsed = JSON.parse(raw) as ProgressData;
    if (!parsed.levels) return { levels: [] };
    return { levels: parsed.levels };
  } catch {
    return { levels: [] };
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
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(CURRENT_LEVEL_KEY);
  } catch {
    return null;
  }
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

export function resetProgress(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(CURRENT_LEVEL_KEY);
  } catch {

  }
}
