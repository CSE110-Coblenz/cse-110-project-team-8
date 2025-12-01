import VimGrid from "./VimGrid.js";
import Konva from "konva";
import { GridView } from "./GridView.js";
import { DualGridView } from "./DualGridView.js";
import { GameView } from "./GameView.js";
import { VimController, TAB_LEFT, TAB_MIDDLE, TAB_RIGHT } from "./VimController.js";
import { PauseOverlay, PauseData } from "./pauseOverlay.js";

export interface Keyframe {
  tMs: number;
  state: string[]; // Raw string array from JSON
}

export interface LevelData {
  keyframes: Keyframe[];
  name?: string;
  description?: string;
}

export class Level {
    private readonly keyframes: Keyframe[];
    private readonly name: string;
    private readonly description: string;
    private readonly id: string; // Level ID for scoring
    private stage: Konva.Stage | null = null;
    private controller: VimController | null = null;
    private gameView: GameView | null = null;
    private dualView: DualGridView | null = null;
    private leftView: GridView | null = null;
    private rightView: GridView | null = null;
    private leftGrid: VimGrid | null = null;
    private rightGrid: VimGrid | null = null;
    private gameInitialized = false;
    private readonly HALF_VIEW_WIDTH = window.innerWidth / 2;
    private startTime: number = 0;
    private currentKeyframeIndex: number = 0;
    private keyframeStartTime: number = 0; // Time when current keyframe started
    private keyframePausedTime: number = 0; // Accumulated paused time for current keyframe
    private keyframePauseStart: number = 0; // When the current pause started (0 if not paused)
    private score: number = 0;
    private keyframeScores: number[] = [];
    private checkInterval: number | null = null;
    private isInBuffer: boolean = false; // Whether we're in the 1 second buffer period
    private bufferStartTime: number = 0; // When the buffer period started
    private blinkCount: number = 0; // Number of blinks completed
    private blinkInterval: number | null = null; // Interval for blinking
    private pendingAdvance: number | null = null; // Timeout ID for pending keyframe advance
    private onComplete: (() => void) | null = null; // Callback when level is completed
    private pauseOverlay: PauseOverlay | null = null; // Pause overlay UI
    private gamePaused: boolean = false; // Whether the game is paused
    private levelStartTime: number = 0; // When the current level session started (resets on resume)
    private levelElapsedActive: number = 0; // Accumulated active time (excluding paused time)
    private onExit?: () => void; // Callback when exiting the level

    /**
     * Sets the completion callback.
     */
    setOnComplete(callback: () => void): void {
        this.onComplete = callback;
    }

    /**
     * Sets the exit callback (called when user exits from pause menu).
     */
    setOnExit(callback: () => void): void {
        this.onExit = callback;
    }

    /**
     * Creates a new Level instance from level data.
     * @param levelData: level data containing keyframes and optional metadata
     * @param onComplete: optional callback when level is completed
     * @param id: optional level ID for scoring
     */
    constructor(levelData: LevelData, onComplete?: () => void, id?: string) {
        this.keyframes = levelData.keyframes;
        this.name = levelData.name || "Untitled Level";
        this.description = levelData.description || "";
        this.id = id || "unknown";
        this.onComplete = onComplete || null;
    }

    /**
     * Gets the level ID.
     */
    getId(): string {
        return this.id;
    }

    /**
     * Gets the level name.
     */
    getName(): string {
        return this.name;
    }

    /**
     * Gets the level description.
     */
    getDescription(): string {
        return this.description;
    }

    /**
     * Loads a level from a JSON file.
     * @param path: path to the JSON file containing level data
     * @param onComplete: optional callback when level is completed
     * @param id: optional level ID for scoring
     * @returns A Promise that resolves to a Level instance
     */
    static async fromFile(path: string, onComplete?: () => void, id?: string): Promise<Level> {
        const response = await fetch(path);
        const levelData = await response.json() as LevelData;
        return new Level(levelData, onComplete, id);
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
     * Checks if two grids match perfectly (all characters match).
     * @param expected - The expected VimGrid
     * @param actual - The actual VimGrid
     * @returns True if grids match perfectly
     */
    private static isPerfectMatch(expected: VimGrid, actual: VimGrid): boolean {
        const rows = Math.max(expected.numRows, actual.numRows);
        for (let r = 0; r < rows; r++) {
            const cols = Math.max(
                r < expected.numRows ? expected.numCols : 0,
                r < actual.numRows ? actual.numCols : 0
            );

            for (let c = 0; c < cols; c++) {
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

                if (normalizedExpected !== normalizedActual) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Compares an expected grid with an actual grid and returns a score based on character matches.
     * @param expected - The expected VimGrid to compare against
     * @param actual - The actual VimGrid to score
     * @param timeMs - Time taken to complete (in milliseconds)
     * @param maxTimeMs - Maximum time allowed (in milliseconds)
     * @returns A score from 0-100 based on the match ratio and time bonus
     */
    static score(expected: VimGrid, actual: VimGrid, timeMs: number = 0, maxTimeMs: number = 0): number {
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

        // Base score from match ratio
        let baseScore = 0;
        if (ratio === 1) baseScore = 100; // perfect
        else if (ratio >= 0.95) baseScore = 90;
        else if (ratio >= 0.9) baseScore = 75;
        else if (ratio >= 0.8) baseScore = 60;
        else if (ratio >= 0.7) baseScore = 40;
        else if (ratio >= 0.5) baseScore = 20;
        else baseScore = 0;

        // Add time bonus for perfect matches (faster = more bonus)
        let timeBonus = 0;
        if (ratio === 1 && maxTimeMs > 0 && timeMs < maxTimeMs) {
            const timeRatio = 1 - (timeMs / maxTimeMs); // 1.0 if instant, 0.0 if at max time
            timeBonus = Math.round(timeRatio * 50); // Up to 50 bonus points
            baseScore = Math.min(150, baseScore + timeBonus); // Allow scores up to 150 with bonus
        }

        // Log time bonus for debugging
        if (timeBonus > 0) {
            console.log(`Time bonus: +${timeBonus} (completed in ${timeMs}ms out of ${maxTimeMs}ms)`);
        }

        return baseScore;
    }

    /**
     * Handles keyboard input events and updates the game state accordingly.
     * @param event - The keyboard event to process
     */
    private handleKeyPress = (event: KeyboardEvent) => {
        // Handle F9 for pause/unpause
        if (event.key === "F9" && this.gameInitialized) {
            event.preventDefault();
            this.togglePause();
            return;
        }

        // Disable all input during buffer period (flashing transition) or when paused
        if (this.isInBuffer || this.gamePaused) {
            event.preventDefault();
            return;
        }
        
        if (!this.controller || !this.leftView || !this.leftGrid) return;
        
        // Prevent default browser behavior for vim keys
        event.preventDefault();
        
        this.controller.handleInput(event);
        
        // Mark mismatches after input for real-time feedback
        this.markMismatches();
        
        // Update the view after handling input
        this.leftView.update(this.leftGrid);
        this.gameView?.updateModeLabel();
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
            this.gameView?.resize(window.innerWidth, window.innerHeight);
        }
    };

    /**
     * Updates the score display in the UI.
     */
    private updateScoreDisplay(): void {
        if (this.gameView) {
            this.gameView.updateScore(this.score, this.currentKeyframeIndex, this.keyframes.length);
        }
    }

    /**
     * Updates the timer display in the UI.
     */
    private updateTimerDisplay(): void {
        if (this.gameView && this.currentKeyframeIndex > 0 && this.currentKeyframeIndex < this.keyframes.length) {
            const maxTime = this.getMaxTimeForKeyframe(this.currentKeyframeIndex);
            // Calculate elapsed time excluding paused time
            let elapsedTime = Date.now() - this.keyframeStartTime;
            if (this.keyframePauseStart > 0) {
                // Currently paused - use pause start time
                elapsedTime = this.keyframePauseStart - this.keyframeStartTime;
            }
            elapsedTime -= this.keyframePausedTime;
            const timeRemaining = Math.max(0, maxTime - elapsedTime);
            this.gameView.updateTimer(timeRemaining, maxTime);
        }
    }

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
     * Applies visual feedback by blinking highlights.
     * @param isPerfect - Whether the match was perfect (green) or not (red)
     * @param isLastKeyframe - Whether this is the last keyframe (longer flash)
     */
    private startBlinkFeedback(isPerfect: boolean, isLastKeyframe: boolean = false): void {
        if (this.isInBuffer) return; // Already blinking
        
        this.isInBuffer = true;
        this.bufferStartTime = Date.now();
        this.blinkCount = 0;
        
        // Clear any existing blink interval
        if (this.blinkInterval !== null) {
            clearInterval(this.blinkInterval);
        }
        
        const blinkDuration = 100; // 100ms per blink
        const totalBlinks = isLastKeyframe ? 20 : 5; // 20 blinks (2 seconds) for last keyframe, 5 for others
        
        // Apply initial highlight
        this.applyFeedbackHighlight(isPerfect);
        
        this.blinkInterval = window.setInterval(() => {
            this.blinkCount++;
            
            if (this.blinkCount >= totalBlinks) {
                // Done blinking, clear highlights
                this.clearFeedbackHighlight();
                if (this.blinkInterval !== null) {
                    clearInterval(this.blinkInterval);
                    this.blinkInterval = null;
                }
                // Don't set isInBuffer to false here - keep it true until advance happens
            } else {
                // Toggle highlight
                if (this.blinkCount % 2 === 0) {
                    this.applyFeedbackHighlight(isPerfect);
                } else {
                    this.clearFeedbackHighlight();
                }
            }
        }, blinkDuration);
    }

    /**
     * Applies feedback highlight to grids (green for perfect, red for mismatches).
     */
    private applyFeedbackHighlight(isPerfect: boolean): void {
        if (!this.leftGrid || !this.rightGrid) return;
        
        if (isPerfect) {
            // Highlight entire left grid green
            for (let r = 0; r < this.leftGrid.numRows; r++) {
                for (let c = 0; c < this.leftGrid.numCols; c++) {
                    const cell = this.leftGrid.get(r, c);
                    this.leftGrid.set(r, c, { ch: cell.ch, hl: "Perfect" });
                }
            }
        } else {
            // Highlight mismatches red
            this.markMismatches();
        }
        
        if (this.leftView) {
            this.leftView.update(this.leftGrid);
        }
        if (this.rightView) {
            this.rightView.update(this.rightGrid);
        }
        this.stage?.getLayers()[0]?.draw();
    }

    /**
     * Clears feedback highlights.
     */
    private clearFeedbackHighlight(): void {
        if (!this.leftGrid || !this.rightGrid) return;
        
        // Clear Perfect highlights from left grid
        for (let r = 0; r < this.leftGrid.numRows; r++) {
            for (let c = 0; c < this.leftGrid.numCols; c++) {
                const cell = this.leftGrid.get(r, c);
                if (cell.hl === "Perfect") {
                    this.leftGrid.set(r, c, { ch: cell.ch });
                }
            }
        }
        
        // Clear Mismatch highlights from right grid
        for (let r = 0; r < this.rightGrid.numRows; r++) {
            for (let c = 0; c < this.rightGrid.numCols; c++) {
                const cell = this.rightGrid.get(r, c);
                if (cell.hl === "Mismatch") {
                    this.rightGrid.set(r, c, { ch: cell.ch });
                }
            }
        }
        
        if (this.leftView) {
            this.leftView.update(this.leftGrid);
        }
        if (this.rightView) {
            this.rightView.update(this.rightGrid);
        }
        this.stage?.getLayers()[0]?.draw();
    }

    /**
     * Checks if keyframe timestamps have been reached, scores the player's grid,
     * and advances to the next keyframe. Also checks for perfect matches.
     */
    private checkKeyframes = () => {
        if (!this.leftGrid || this.keyframes.length === 0 || this.isInBuffer || this.gamePaused) {
            // Still update timer even when paused/buffered
            this.updateTimerDisplay();
            return;
        }
        
        // Update timer and score display
        this.updateTimerDisplay();
        this.updateScoreDisplay();

        // Mark mismatches for real-time feedback
        this.markMismatches();

        // Check for perfect match (auto-advance)
        // Skip index 0 as it's the initial state, not a target
        if (this.currentKeyframeIndex > 0 && this.currentKeyframeIndex < this.keyframes.length && this.rightGrid) {
            const currentKeyframe = this.keyframes[this.currentKeyframeIndex];
            const expectedGrid = Level.keyframeToVimGrid(currentKeyframe);
            
            if (Level.isPerfectMatch(expectedGrid, this.leftGrid)) {
                // Perfect match! Calculate score BEFORE any updates
                let timeTaken = Date.now() - this.keyframeStartTime;
                timeTaken -= this.keyframePausedTime;
                const maxTime = this.getMaxTimeForKeyframe(this.currentKeyframeIndex);
                const keyframeScore = Level.score(expectedGrid, this.leftGrid, timeTaken, maxTime);
                
                console.log(`Perfect match! Keyframe ${this.currentKeyframeIndex} score: ${keyframeScore} (time: ${timeTaken}ms, max: ${maxTime}ms, timeRatio: ${((1 - timeTaken / maxTime) * 100).toFixed(1)}%)`);
                
                // Store score
                this.keyframeScores.push(keyframeScore);
                this.updateTotalScore();
                
                // Check if this is the last keyframe
                const isLastKeyframe = this.currentKeyframeIndex >= this.keyframes.length - 1;
                
                // Start blinking feedback (green) - longer for last keyframe
                this.startBlinkFeedback(true, isLastKeyframe);
                
                // Cancel any pending advance
                if (this.pendingAdvance !== null) {
                    clearTimeout(this.pendingAdvance);
                }
                
                if (isLastKeyframe) {
                    // Last keyframe: flash longer (2 seconds), then return to level select
                    this.pendingAdvance = window.setTimeout(() => {
                        this.pendingAdvance = null;
                        this.isInBuffer = false;
                        if (this.onComplete) {
                            this.onComplete();
                        }
                    }, 2000);
                } else {
                    // Advance after buffer period (500ms for flash, then update leftgrid happens in advance)
                    this.pendingAdvance = window.setTimeout(() => {
                        this.pendingAdvance = null;
                        this.advanceToNextKeyframe();
                    }, 500);
                }
                
                return;
            }
        }

        // Check if time limit reached (forced keyframe switch)
        // Skip index 0 as it's the initial state, not a target
        if (this.currentKeyframeIndex > 0 && this.currentKeyframeIndex < this.keyframes.length) {
            const currentKeyframe = this.keyframes[this.currentKeyframeIndex];
            let timeSinceKeyframeStart = Date.now() - this.keyframeStartTime;
            timeSinceKeyframeStart -= this.keyframePausedTime;
            const maxTime = this.getMaxTimeForKeyframe(this.currentKeyframeIndex);
            
            if (timeSinceKeyframeStart >= maxTime) {
                // Time limit reached
                const expectedGrid = Level.keyframeToVimGrid(currentKeyframe);
                const isPerfect = Level.isPerfectMatch(expectedGrid, this.leftGrid);
                
                // Calculate score with actual time taken (which is maxTime since we hit the limit)
                const keyframeScore = Level.score(expectedGrid, this.leftGrid, maxTime, maxTime);
                
                console.log(`Time limit reached. Keyframe ${this.currentKeyframeIndex} score: ${keyframeScore} (time: ${maxTime}ms)`);
                
                // Store score
                this.keyframeScores.push(keyframeScore);
                this.updateTotalScore();
                
                // Check if this is the last keyframe
                const isLastKeyframe = this.currentKeyframeIndex >= this.keyframes.length - 1;
                
                // Start blinking feedback (red if imperfect, green if perfect) - longer for last keyframe
                this.startBlinkFeedback(isPerfect, isLastKeyframe);
                
                // Cancel any pending advance
                if (this.pendingAdvance !== null) {
                    clearTimeout(this.pendingAdvance);
                }
                
                if (isLastKeyframe) {
                    // Last keyframe: update left grid, flash longer (2 seconds), then return to level select
                    if (!isPerfect) {
                        this.forceUpdateLeftGrid(expectedGrid);
                    }
                    this.pendingAdvance = window.setTimeout(() => {
                        this.pendingAdvance = null;
                        this.isInBuffer = false;
                        if (this.onComplete) {
                            this.onComplete();
                        }
                    }, 2000);
                } else {
                    // Update left grid after flash, then advance
                    this.pendingAdvance = window.setTimeout(() => {
                        this.pendingAdvance = null;
                        // Update left grid if not perfect
                        if (!isPerfect) {
                            this.forceUpdateLeftGrid(expectedGrid);
                        }
                        this.advanceToNextKeyframe();
                    }, 500);
                }
            }
        }
    };

    /**
     * Gets the maximum time allowed for a keyframe (relative time from previous).
     */
    private getMaxTimeForKeyframe(index: number): number {
        if (index === 0) {
            // First keyframe: use its relative time or default to 10000ms
            return this.keyframes[0].tMs || 10000;
        }
        if (index < this.keyframes.length) {
            return this.keyframes[index].tMs || 10000;
        }
        return 10000; // Default
    }

    /**
     * Forces the left grid to match the expected grid.
     */
    private forceUpdateLeftGrid(expectedGrid: VimGrid): void {
        if (!this.leftGrid) return;
        
        // Copy expected grid content to left grid cell by cell
        const maxRows = Math.max(this.leftGrid.numRows, expectedGrid.numRows);
        const maxCols = Math.max(this.leftGrid.numCols, expectedGrid.numCols);
        
        // Expand left grid if needed
        while (this.leftGrid.numRows < maxRows) {
            this.leftGrid.appendRow();
        }
        while (this.leftGrid.numCols < maxCols) {
            this.leftGrid.appendColumn();
        }
        
        // Copy all cells from expected to left
        for (let r = 0; r < expectedGrid.numRows; r++) {
            for (let c = 0; c < expectedGrid.numCols; c++) {
                const cell = expectedGrid.get(r, c);
                this.leftGrid.set(r, c, { ch: cell.ch });
            }
        }
        
        // Clear any cells beyond expected grid
        for (let r = expectedGrid.numRows; r < this.leftGrid.numRows; r++) {
            for (let c = 0; c < this.leftGrid.numCols; c++) {
                this.leftGrid.set(r, c, { ch: '' });
            }
        }
        for (let r = 0; r < expectedGrid.numRows; r++) {
            for (let c = expectedGrid.numCols; c < this.leftGrid.numCols; c++) {
                this.leftGrid.set(r, c, { ch: '' });
            }
        }
        
        // Update the controller to use the updated grid (controller already has reference)
        // Update the view
        if (this.leftView) {
            this.leftView.update(this.leftGrid);
            const cursor = this.leftGrid.getCursor();
            this.leftView.setCursor(cursor.row, cursor.col);
        }
    }

    /**
     * Advances to the next keyframe.
     * Note: This does NOT update the left grid - that should be done before calling this.
     */
    private advanceToNextKeyframe(): void {
        // Only advance if we're not already at the end
        if (this.currentKeyframeIndex >= this.keyframes.length - 1) {
            this.isInBuffer = false; // Release buffer if at end
            return;
        }
        
        this.currentKeyframeIndex++;
        this.keyframeStartTime = Date.now();
        this.keyframePausedTime = 0;
        this.keyframePauseStart = 0;
        this.isInBuffer = false; // Release buffer after advancing
        this.updateRightGrid();
        
        console.log(`Advanced to keyframe ${this.currentKeyframeIndex}`);
    }

    /**
     * Updates the total score based on all keyframe scores.
     */
    private updateTotalScore(): void {
        const oldScore = this.score;
        if (this.keyframeScores.length > 0) {
            const sum = this.keyframeScores.reduce((a, b) => a + b, 0);
            this.score = Math.round(sum / this.keyframeScores.length);
        }
        
        if (this.score !== oldScore || this.keyframeScores.length === 1) {
            console.log(`Current score: ${this.score}`);
        }
    }

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
        if (!this.gameInitialized || !this.stage) {
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
            const viewWidth = window.innerWidth / 2;
            const viewHeight = window.innerHeight;
            this.leftView = new GridView(this.leftGrid, viewWidth, viewHeight);
            this.rightView = new GridView(this.rightGrid, viewWidth, viewHeight);
            this.dualView = new DualGridView(this.leftView, this.rightView, viewWidth, viewHeight);
            
            // Create GameView which includes ScoreDisplay and DualGridView
            this.gameView = new GameView(this.dualView, window.innerWidth, window.innerHeight);

            layer.add(this.gameView.getGroup());
            
            // Update views to ensure they're properly rendered
            this.leftView.update(this.leftGrid);
            this.rightView.update(this.rightGrid);
            
            // Set initial cursor position
            const cursor = this.leftGrid.getCursor();
            this.leftView.setCursor(cursor.row, cursor.col);
            this.gameView.updateModeLabel();
            
            // Initialize score and timer display
            this.updateScoreDisplay();
            this.updateTimerDisplay();
            
            layer.draw();

            // Set up keyboard event listener
            window.addEventListener("keydown", this.handleKeyPress);
            window.addEventListener("resize", this.handleResize);
            
            // Initialize game state
            this.startTime = Date.now();
            // Start at index 1 since index 0 is the initial state, not a target
            this.currentKeyframeIndex = this.keyframes.length > 1 ? 1 : 0;
            this.keyframeStartTime = Date.now();
            this.keyframePausedTime = 0;
            this.keyframePauseStart = 0;
            this.score = 0;
            this.keyframeScores = [];
            this.isInBuffer = false;
            this.blinkCount = 0;
            this.blinkInterval = null;
            this.pendingAdvance = null;
            // Initialize pause state
            this.gamePaused = false;
            this.levelStartTime = performance.now();
            this.levelElapsedActive = 0;
            this.pauseOverlay = new PauseOverlay();
            
            // Set up interval to check keyframes (check every 100ms)
            if (this.checkInterval !== null) {
                clearInterval(this.checkInterval);
            }
            this.checkInterval = window.setInterval(this.checkKeyframes, 100);
            
            this.gameInitialized = true;
        } else {
            // Stage already initialized, but we need to reset state and update views
            // Clear any existing intervals/timeouts
            if (this.checkInterval !== null) {
                clearInterval(this.checkInterval);
            }
            if (this.blinkInterval !== null) {
                clearInterval(this.blinkInterval);
                this.blinkInterval = null;
            }
            if (this.pendingAdvance !== null) {
                clearTimeout(this.pendingAdvance);
                this.pendingAdvance = null;
            }
            
            // Reset game state
            this.startTime = Date.now();
            // Start at index 1 since index 0 is the initial state, not a target
            this.currentKeyframeIndex = this.keyframes.length > 1 ? 1 : 0;
            this.keyframeStartTime = Date.now();
            this.keyframePausedTime = 0;
            this.keyframePauseStart = 0;
            this.score = 0;
            this.keyframeScores = [];
            this.isInBuffer = false;
            this.blinkCount = 0;
            // Initialize pause state
            this.gamePaused = false;
            this.levelStartTime = performance.now();
            this.levelElapsedActive = 0;
            
            // Reinitialize grids
            if (this.keyframes.length > 0) {
                const firstKeyframe = this.keyframes[0];
                this.leftGrid = Level.keyframeToVimGrid(firstKeyframe);
            } else {
                this.leftGrid = VimGrid.createGridFromText([""]);
            }
            
            if (this.keyframes.length > 1) {
                const nextKeyframe = this.keyframes[1];
                this.rightGrid = Level.keyframeToVimGrid(nextKeyframe);
            } else if (this.keyframes.length === 1) {
                this.rightGrid = Level.keyframeToVimGrid(this.keyframes[0]);
            } else {
                this.rightGrid = VimGrid.createGridFromText([""]);
            }
            
            // Update controller
            this.controller = new VimController(this.leftGrid);
            
            // Update views - they should already exist
            if (this.leftView && this.leftGrid) {
                this.leftView.update(this.leftGrid);
            }
            if (this.rightView && this.rightGrid) {
                this.rightView.update(this.rightGrid);
            }
            
            // Set initial cursor position
            if (this.leftGrid && this.leftView) {
                const cursor = this.leftGrid.getCursor();
                this.leftView.setCursor(cursor.row, cursor.col);
            }
            if (this.dualView) {
                this.dualView.updateModeLabel();
            }
            
            // Restart keyframe checking
            this.checkInterval = window.setInterval(this.checkKeyframes, 100);
            
            // Redraw
            if (this.stage) {
                const layer = this.stage.getLayers()[0];
                if (layer) {
                    layer.draw();
                }
            }
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
     * Accumulates elapsed time when pausing.
     */
    private accumulateElapsedTime(): void {
        this.levelElapsedActive += Math.max(0, performance.now() - this.levelStartTime);
    }

    /**
     * Gets the elapsed time for the level, excluding paused time.
     * @returns Elapsed time in milliseconds
     */
    getLevelElapsedTime(): number {
        if (!this.gameInitialized) return 0;
        if (this.gamePaused) {
            return this.levelElapsedActive;
        }
        return this.levelElapsedActive + Math.max(0, performance.now() - this.levelStartTime);
    }

    /**
     * Sets the pause state of the game.
     * @param paused - Whether the game should be paused
     */
    private setPauseState(paused: boolean): void {
        if (paused === this.gamePaused) return;
        if (paused) {
            this.accumulateElapsedTime();
            // Record when keyframe timer was paused
            this.keyframePauseStart = Date.now();
        } else {
            this.levelStartTime = performance.now();
            // Accumulate paused time for keyframe timer
            if (this.keyframePauseStart > 0) {
                this.keyframePausedTime += Date.now() - this.keyframePauseStart;
                this.keyframePauseStart = 0;
            }
        }
        this.gamePaused = paused;
        document.body.classList.toggle("game-paused", paused);
        if (paused) {
            const pauseData: PauseData = {
                levelName: this.name,
                score: this.score,
                timeMs: this.getLevelElapsedTime(),
            };
            if (!this.pauseOverlay) {
                this.pauseOverlay = new PauseOverlay();
            }
            this.pauseOverlay.show(pauseData, {
                onResume: () => this.setPauseState(false),
                onExit: () => {
                    this.pauseOverlay?.hide();
                    this.setPauseState(false);
                    if (this.onExit) {
                        this.onExit();
                    }
                },
            });
        } else {
            this.pauseOverlay?.hide();
        }
    }

    /**
     * Toggles the pause state of the game.
     */
    togglePause(): void {
        this.setPauseState(!this.gamePaused);
    }

    /**
     * Stops the game by clearing the keyframe checking interval and cleaning up.
     */
    stop(): void {
        // Unpause if paused
        if (this.gamePaused) {
            this.setPauseState(false);
        }
        
        // Hide game view
        document.body.classList.remove("game-active");
        const gameRoot = document.getElementById("game-root");
        if (gameRoot) {
            gameRoot.classList.remove("active");
        }
        
        // Remove event listeners
        window.removeEventListener("keydown", this.handleKeyPress);
        window.removeEventListener("resize", this.handleResize);
        
        // Clear intervals and timeouts
        if (this.checkInterval !== null) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.blinkInterval !== null) {
            clearInterval(this.blinkInterval);
            this.blinkInterval = null;
        }
        if (this.pendingAdvance !== null) {
            clearTimeout(this.pendingAdvance);
            this.pendingAdvance = null;
        }
        
        // Hide pause overlay
        this.pauseOverlay?.hide();
        
        // Destroy stage
        if (this.stage) {
            this.stage.destroy();
            this.stage = null;
        }
        
        // Reset game state
        this.gameInitialized = false;
        this.isInBuffer = false;
        this.gamePaused = false;
    }
}