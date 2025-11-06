import VimGrid from "./vimgrid.js";

export interface Keyframe {
  tMs: number;
  state: string[]; // Raw string array from JSON
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
        const response = await fetch(path);
        const levelData = await response.json() as LevelData;
        return new Level(levelData);
    }

    // Convert a keyframe's string array to a VimGrid
    static keyframeToVimGrid(keyframe: Keyframe): VimGrid {
        return VimGrid.createGridFromText(keyframe.state);
    }

    // Get all keyframes as VimGrid instances
    getKeyframesAsVimGrids(): Array<{ tMs: number; grid: VimGrid }> {
        return this.keyframes.map(kf => ({
            tMs: kf.tMs,
            grid: Level.keyframeToVimGrid(kf)
        }));
    }

    // Get raw keyframes
    getKeyframes(): Keyframe[] {
        return this.keyframes;
    }

    static score(expected: VimGrid, actual: VimGrid): number {
        let matches = 0;
        let total = 0;

        const rows = Math.max(expected.numRows, actual.numRows);
        for (let r = 0; r < rows; r++) {
            const cols = Math.max(
                r < expected.numRows ? expected.numCols : 0,
                r < actual.numRows ? actual.numCols : 0
            );

            for (let c = 0; c < cols; c++) {
                total++;
                let expectedCh = " ";
                let actualCh = " ";

                if (expected.inBounds(r, c)) {
                    expectedCh = expected.get(r, c).ch;
                }
                if (actual.inBounds(r, c)) {
                    actualCh = actual.get(r, c).ch;
                }

                if (expectedCh === actualCh) matches++;
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