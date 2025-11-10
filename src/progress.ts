const STORAGE_KEY = "vimGameProgress";

export interface GameProgress {
  completedLevels: string[];    
  bestScore: number;              
  lastOpenLevelId: string | null; 
}

// Default values if no data exists yet
export const defaultProgress: GameProgress = {
  completedLevels: [],
  bestScore: 0,
  lastOpenLevelId: null,
};

// Save progress to localStorage
export function saveProgress(progress: GameProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error("Failed to save progress:", err);
  }
}

// Load progress from localStorage
export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultProgress };
    return { ...defaultProgress, ...JSON.parse(raw) };
  } catch (err) {
    console.error("Failed to load progress:", err);
    return { ...defaultProgress };
  }
}

export function updateProgress(
  updater: (current: GameProgress) => GameProgress
): GameProgress {
  const current = loadProgress();
  const updated = updater(current);
  saveProgress(updated);
  return updated;
}

export function clearProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

