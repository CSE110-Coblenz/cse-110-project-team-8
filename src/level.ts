import { readFile } from "fs/promises";

export type Grid = string[];

export interface Keyframe {
  tMs: number;
  state: Grid;
}

export interface LevelData {
  keyframes: Keyframe[];
}

export class Level {

    private readonly keyframes: Keyframe[];

    private constructor(levelData: LevelData) {
        this.keyframes = levelData.keyframes;
    }

    static async fromFile(path: string): Promise<Level> {
        const levelData = JSON.parse(await readFile(path, "utf8")) as LevelData;
        return new Level(levelData);
    }

    private static score(expected: Grid, actual: Grid): number {
        let matches = 0;
        let total = 0;

        const rows = Math.max(expected.length, actual.length);
        for (let r = 0; r < rows; r++) {
            const expectedRow = expected[r] ?? "";
            const actualRow = actual[r] ?? "";

            const cols = Math.max(expectedRow.length, actualRow.length);
            for (let c = 0; c < cols; c++) {
                total++;
                if (expectedRow[c] === actualRow[c]) matches++;
            }
        }
        
        if (total === 0) return 0;
        const ratio = matches / total;

        console.log(`${matches} / ${total} = ${ratio}`);

        if (ratio === 1) return 100; // perfect
        if (ratio >= 0.95) return 90; // near-perfect
        if (ratio >= 0.9) return 75; // great
        if (ratio >= 0.8) return 60; // good
        if (ratio >= 0.7) return 40; // okay
        if (ratio >= 0.5) return 20; // poor
        return 0; // miss
    }
}