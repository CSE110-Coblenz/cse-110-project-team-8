import VimGrid from "./VimGrid.js";
import Konva from "konva";
import { GridView } from "./GridView.js";
import { DualGridView } from "./DualGridView.js";
import { VimController, TAB_LEFT, TAB_MIDDLE, TAB_RIGHT } from "./VimController.js";

export interface Keyframe {
  tMs: number;
  state: string[]; // Raw string array from JSON
}

export interface LevelData {
  keyframes: Keyframe[];
}

export class Level {
    private readonly keyframes: Keyframe[];
    private stage: Konva.Stage | null = null;
    private controller: VimController | null = null;
    private dualView: DualGridView | null = null;
    private leftView: GridView | null = null;
    private rightView: GridView | null = null;
    private leftGrid: VimGrid | null = null;
    private rightGrid: VimGrid | null = null;
    private gameInitialized = false;
    private readonly HALF_VIEW_WIDTH = window.innerWidth / 2;
    private startTime: number = 0;
    private currentKeyframeIndex: number = 0;
    private score: number = 0;
    private keyframeScores: number[] = [];
    private checkInterval: number | null = null;

    /**
     * Creates a new Level instance from level data.
     * @param levelData: level data containing keyframes
     */
    constructor(levelData: LevelData) {
        this.keyframes = levelData.keyframes;
    }

    /**
     * Loads a level from a JSON file.
     * @param path: path to the JSON file containing level data
     * @returns A Promise that resolves to a Level instance
     */
    static async fromFile(path: string): Promise<Level> {
        const response = await fetch(path);
        const levelData = await response.json() as LevelData;
        return new Level(levelData);
    }

    /**
     * Converts a keyframe's string array to a VimGrid instance.
     * @param keyframe: keyframe containing a state array of strings
     * @returns A VimGrid created from the keyframe's state
     */
    static keyframeToVimGrid(keyframe: Keyframe): VimGrid {
        return VimGrid.createGridFromText(keyframe.state);
    }

    /**
     * Returns all keyframes as VimGrid instances with their timestamps.
     * @returns An array of objects containing the timestamp and corresponding VimGrid
     */
    getKeyframesAsVimGrids(): Array<{ tMs: number; grid: VimGrid }> {
        return this.keyframes.map(kf => ({
            tMs: kf.tMs,
            grid: Level.keyframeToVimGrid(kf)
        }));
    }

    /**
     * Returns the raw keyframes array.
     * @returns The array of keyframes with timestamps and state strings
     */
    getKeyframes(): Keyframe[] {
        return this.keyframes;
    }

    /**
     * Normalizes whitespace characters to be equivalent for comparison.
     * Spaces, tab characters, and empty strings are all treated as whitespace.
     * @param ch - The character to normalize
     * @returns Normalized character (whitespace characters become empty string)
     */
    private static normalizeWhitespace(ch: string): string {
        // Treat spaces, tab characters, and empty strings as equivalent
        if (ch === " " || ch === "" || ch === TAB_LEFT || ch === TAB_MIDDLE || ch === TAB_RIGHT) {
            return "";
        }
        return ch;
    }

    /**
     * Compares an expected grid with an actual grid and returns a score based on character matches.
     * @param expected - The expected VimGrid to compare against
     * @param actual - The actual VimGrid to score
     * @returns A score from 0-100 based on the match ratio
     */
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

                // Normalize whitespace for comparison
                const normalizedExpected = Level.normalizeWhitespace(expectedCh);
                const normalizedActual = Level.normalizeWhitespace(actualCh);

                if (normalizedExpected === normalizedActual) matches++;
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

    /**
     * Handles keyboard input events and updates the game state accordingly.
     * @param event - The keyboard event to process
     */
    private handleKeyPress = (event: KeyboardEvent) => {
        if (!this.controller || !this.leftView || !this.leftGrid) return;
        
        // Prevent default browser behavior for vim keys
        event.preventDefault();
        
        this.controller.handleInput(event);
        
        // Mark mismatches after input for real-time feedback
        this.markMismatches();
        
        // Update the view after handling input
        this.leftView.update(this.leftGrid);
        this.dualView?.updateModeLabel();
        const cursor = this.leftGrid.getCursor();
        this.leftView.setCursor(cursor.row, cursor.col);
    };

    /**
     * Handles window resize events and updates the Konva stage dimensions.
     */
    private handleResize = () => {
        if (this.stage) {
            this.stage.width(window.innerWidth);
            this.stage.height(window.innerHeight);
        }
    };

    /**
     * Marks cells in the right grid (target) that don't match the left grid (player's input) with red text.
     */
    private markMismatches(): void {
        if (!this.leftGrid || !this.rightGrid) return;

        // Compare right grid (expected) with left grid (actual)
        const rows = Math.max(this.leftGrid.numRows, this.rightGrid.numRows);
        for (let r = 0; r < rows; r++) {
            const cols = Math.max(
                r < this.leftGrid.numRows ? this.leftGrid.numCols : 0,
                r < this.rightGrid.numRows ? this.rightGrid.numCols : 0
            );
            
            for (let c = 0; c < cols; c++) {
                let expectedCh = " ";
                let actualCh = " ";
                
                if (this.rightGrid.inBounds(r, c)) {
                    expectedCh = this.rightGrid.get(r, c).ch;
                }
                if (this.leftGrid.inBounds(r, c)) {
                    actualCh = this.leftGrid.get(r, c).ch;
                }
                
                // Mark mismatch in right grid if characters don't match
                // Normalize whitespace for comparison (spaces, tabs, empty all treated as equivalent)
                const normalizedExpected = Level.normalizeWhitespace(expectedCh);
                const normalizedActual = Level.normalizeWhitespace(actualCh);
                
                if (this.rightGrid.inBounds(r, c)) {
                    const cell = this.rightGrid.get(r, c);
                    if (normalizedExpected !== normalizedActual) {
                        // Set mismatch highlight (red text) in right grid
                        this.rightGrid.set(r, c, { ch: cell.ch, hl: "Mismatch" });
                    } else {
                        // Clear mismatch highlight if it matches
                        if (cell.hl === "Mismatch") {
                            this.rightGrid.set(r, c, { ch: cell.ch });
                        }
                    }
                }
            }
        }
        
        // Update the right view to reflect the changes
        if (this.rightView) {
            this.rightView.update(this.rightGrid);
        }
    }

    /**
     * Checks if keyframe timestamps have been reached, scores the player's grid,
     * and advances to the next keyframe.
     */
    private checkKeyframes = () => {
        if (!this.leftGrid || this.keyframes.length === 0) return;

        // Mark mismatches for real-time feedback
        this.markMismatches();

        const currentTime = Date.now() - this.startTime;

        // Check if we've reached the current keyframe's timestamp
        if (this.currentKeyframeIndex < this.keyframes.length) {
            const currentKeyframe = this.keyframes[this.currentKeyframeIndex];
            
            if (currentTime >= currentKeyframe.tMs) {
                // Compare leftGrid with expected keyframe
                const expectedGrid = Level.keyframeToVimGrid(currentKeyframe);
                const keyframeScore = Level.score(expectedGrid, this.leftGrid);
                
                // Store this keyframe's score
                this.keyframeScores.push(keyframeScore);
                
                // Update total score (average of all keyframe scores so far)
                const oldScore = this.score;
                if (this.keyframeScores.length > 0) {
                    const sum = this.keyframeScores.reduce((a, b) => a + b, 0);
                    this.score = Math.round(sum / this.keyframeScores.length);
                }
                
                // Log score when it's updated
                if (this.score !== oldScore || this.keyframeScores.length === 1) {
                    console.log(`Current score: ${this.score}`);
                }
                
                console.log(`Keyframe ${this.currentKeyframeIndex} (t=${currentKeyframe.tMs}ms) score: ${keyframeScore}, Average: ${this.score}`);

                // Move to next keyframe and update right grid
                this.currentKeyframeIndex++;
                this.updateRightGrid();
            }
        }
    };

    /**
     * Updates the right grid view to display the next keyframe target.
     */
    private updateRightGrid(): void {
        if (!this.rightView || this.currentKeyframeIndex >= this.keyframes.length) {
            return;
        }

        // Show the next keyframe in the right grid
        const nextKeyframe = this.keyframes[this.currentKeyframeIndex];
        const nextGrid = Level.keyframeToVimGrid(nextKeyframe);
        
        // Update the right grid (this will clear any previous mismatch highlights)
        this.rightGrid = nextGrid;
        this.rightView.update(nextGrid);
        
        // Mark mismatches with the new keyframe
        this.markMismatches();
        
        // Redraw the layer
        this.stage?.getLayers()[0]?.draw();
    }

    /**
     * Initializes and starts the game, setting up the Konva stage, grids, views, and event listeners.
     */
    start(): void {
        // Hide homepage UI
        document.body.classList.add("game-active");
        
        // Show game container
        const gameRoot = document.getElementById("game-root");
        if (!gameRoot) return;
        gameRoot.classList.add("active");

        // Initialize Konva stage if not already done
        if (!this.gameInitialized) {
            this.stage = new Konva.Stage({
                container: "game-root",
                width: window.innerWidth,
                height: window.innerHeight,
            });

            const layer = new Konva.Layer();
            this.stage.add(layer);

            // Initialize left grid (player's editable grid)
            // Start with the first keyframe as initial state, or empty if no keyframes
            if (this.keyframes.length > 0) {
                const firstKeyframe = this.keyframes[0];
                this.leftGrid = Level.keyframeToVimGrid(firstKeyframe);
            } else {
                this.leftGrid = VimGrid.createGridFromText([""]);
            }
            
            // Initialize right grid with the next keyframe (or first if only one)
            if (this.keyframes.length > 1) {
                const nextKeyframe = this.keyframes[1];
                this.rightGrid = Level.keyframeToVimGrid(nextKeyframe);
            } else if (this.keyframes.length === 1) {
                // If only one keyframe, show it in the right grid
                this.rightGrid = Level.keyframeToVimGrid(this.keyframes[0]);
            } else {
                this.rightGrid = VimGrid.createGridFromText([""]);
            }

            // Create the controller
            this.controller = new VimController(this.leftGrid);

            // Create the view (VimGridView)
            this.leftView = new GridView(this.leftGrid, 0);
            this.rightView = new GridView(this.rightGrid, this.HALF_VIEW_WIDTH);
            this.dualView = new DualGridView(this.leftView, this.rightView, this.HALF_VIEW_WIDTH, window.innerHeight);

            layer.add(this.dualView.getGroup());
            
            // Set initial cursor position
            const cursor = this.leftGrid.getCursor();
            this.leftView.setCursor(cursor.row, cursor.col);
            layer.draw();

            // Set up keyboard event listener
            window.addEventListener("keydown", this.handleKeyPress);
            window.addEventListener("resize", this.handleResize);
            
            // Initialize game state
            this.startTime = Date.now();
            this.currentKeyframeIndex = 0;
            this.score = 0;
            this.keyframeScores = [];
            
            // Set up interval to check keyframes (check every 100ms)
            this.checkInterval = window.setInterval(this.checkKeyframes, 100);
            
            this.gameInitialized = true;
        }
    }

    /**
     * Returns the current average score across all checked keyframes.
     * @returns The average score (0-100)
     */
    getScore(): number {
        return this.score;
    }

    /**
     * Stops the game by clearing the keyframe checking interval.
     */
    stop(): void {
        if (this.checkInterval !== null) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}