export interface PlayerData {
  rank: number;
  name: string;
  score: number;
  levelScores?: Record<string, number>; // Level ID -> Score mapping
}

export class Player {
  rank: number;
  name: string;
  score: number; // Total score (sum of all level scores)
  private levelScores: Record<string, number>; // Level ID -> Score mapping

  constructor(data: PlayerData) {
    this.rank = data.rank;
    this.name = data.name;
    this.score = data.score || 0;
    this.levelScores = data.levelScores || {};
    // Recalculate total score from level scores if provided
    if (data.levelScores) {
      this.recalculateTotalScore();
    }
  }

  /**
   * Updates the score for a specific level.
   * @param levelId - The ID of the level
   * @param score - The score achieved for this level
   */
  setLevelScore(levelId: string, score: number): void {
    this.levelScores[levelId] = score;
    this.recalculateTotalScore();
  }

  /**
   * Gets the score for a specific level.
   * @param levelId - The ID of the level
   * @returns The score for this level, or 0 if not completed
   */
  getLevelScore(levelId: string): number {
    return this.levelScores[levelId] || 0;
  }

  /**
   * Recalculates the total score from all level scores.
   */
  private recalculateTotalScore(): void {
    this.score = Object.values(this.levelScores).reduce((sum, score) => sum + score, 0);
  }

  /**
   * Gets all level scores.
   * @returns A copy of the level scores mapping
   */
  getAllLevelScores(): Record<string, number> {
    return { ...this.levelScores };
  }

  renderRow(): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${this.rank}</td>
      <td>${this.name}</td>
      <td>${this.score.toLocaleString()}</td>
    `;
    return row;
  }
}
