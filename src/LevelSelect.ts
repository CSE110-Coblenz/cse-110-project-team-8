import VimGrid, { Mode } from "./VimGrid.js";
import Konva from "konva";
import { GridView } from "./GridView.js";
import { DualGridView } from "./DualGridView.js";
import { LevelSelectController } from "./LevelSelectController.js";
import { Level } from "./level.js";
import { Player } from "./player.js";

export interface LevelIndexEntry {
    id: string;
    file: string;
}

export interface LevelIndex {
    levels: LevelIndexEntry[];
}

export class LevelSelect {
    private stage: Konva.Stage | null = null;
    private controller: LevelSelectController | null = null;
    private dualView: DualGridView | null = null;
    private leftView: GridView | null = null;
    private rightView: GridView | null = null;
    private leftGrid: VimGrid | null = null;
    private rightGrid: VimGrid | null = null;
    private levels: Level[] = [];
    private selectedLevelIndex: number = 0;
    private onLevelSelected: (level: Level) => void;
    private player: Player | null = null;
    private readonly HALF_VIEW_WIDTH = window.innerWidth / 2;
    private menuInitialized = false;

    constructor(onLevelSelected: (level: Level) => void, player: Player | null = null) {
        this.onLevelSelected = onLevelSelected;
        this.player = player;
    }

    /**
     * Loads the level index and instantiates all Level objects.
     */
    static async loadLevels(): Promise<Level[]> {
        const response = await fetch("/src/levels/index.json");
        const levelIndex = await response.json() as LevelIndex;
        
        // Load all levels with their IDs
        const levels = await Promise.all(
            levelIndex.levels.map(entry => 
                Level.fromFile(`/src/levels/${entry.file}`, undefined, entry.id)
            )
        );
        
        return levels;
    }

    /**
     * Creates a VimGrid from level list for the left view.
     */
    private createLevelListGrid(levels: Level[]): VimGrid {
        const lines: string[] = [];
        levels.forEach((level, index) => {
            lines.push(`${index + 1}. ${level.getName()}`);
        });
        
        // Add exit option at the end
        lines.push("Exit to Home");
        
        // Find max width needed
        const maxWidth = Math.max(...lines.map(line => line.length), 30);
        const grid = VimGrid.createGridFromText(lines, maxWidth);
        // Set cursor to start of first line
        grid.setCursor(0, 0);
        return grid;
    }

    /**
     * Creates a VimGrid for the right view with instructions and player info.
     */
    private createInstructionsGrid(levels: Level[], selectedIndex: number, player: Player | null): VimGrid {
        const lines: string[] = [];
        
        lines.push("LEVEL SELECT");
        lines.push("");
        lines.push("Navigation:");
        lines.push("  Arrow Keys or hjkl");
        lines.push("  to move cursor");
        lines.push("");
        lines.push("Enter - Start Level");
        lines.push("");
        lines.push("---");
        lines.push("");
        
        if (selectedIndex === levels.length) {
            // Exit option selected
            lines.push("Selected:");
            lines.push("Exit to Home");
            lines.push("");
            lines.push("Description:");
            lines.push("Return to the main");
            lines.push("homepage.");
        } else if (levels.length > selectedIndex) {
            const selected = levels[selectedIndex];
            lines.push("Selected:");
            lines.push(selected.getName());
            lines.push("");
            lines.push("Description:");
            const descLines = this.wrapText(selected.getDescription(), 30);
            descLines.forEach(line => lines.push(line));
            
            // Show level score if available
            if (player) {
                const levelScore = player.getLevelScore(selected.getId());
                if (levelScore > 0) {
                    lines.push("");
                    lines.push(`Level Score: ${levelScore.toLocaleString()}`);
                }
            }
        }
        
        lines.push("");
        lines.push("---");
        lines.push("");
        
        if (player) {
            lines.push("Player:");
            lines.push(`Name: ${player.name}`);
            lines.push(`Total Score: ${player.score.toLocaleString()}`);
        } else {
            lines.push("Player:");
            lines.push("Name: Guest");
            lines.push("Total Score: 0");
        }
        
        const maxWidth = Math.max(...lines.map(line => line.length), 30);
        return VimGrid.createGridFromText(lines, maxWidth);
    }

    /**
     * Wraps text to fit within a given width.
     */
    private wrapText(text: string, width: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        words.forEach(word => {
            if ((currentLine + word).length <= width) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine) lines.push(currentLine);
        
        return lines;
    }

    /**
     * Updates the highlight for the selected level.
     */
    private updateHighlight(): void {
        if (!this.leftGrid) return;
        
        // Clear all highlights
        for (let r = 0; r < this.leftGrid.numRows; r++) {
            for (let c = 0; c < this.leftGrid.numCols; c++) {
                const cell = this.leftGrid.get(r, c);
                if (cell.hl === "LevelSelect") {
                    this.leftGrid.set(r, c, { ch: cell.ch });
                }
            }
        }
        
        // Highlight the selected row
        let rowToHighlight: number;
        if (this.selectedLevelIndex === this.levels.length) {
            // Exit option is at row levels.length
            rowToHighlight = this.levels.length;
        } else {
            // Regular level
            rowToHighlight = this.selectedLevelIndex;
        }
        
        if (rowToHighlight >= 0 && rowToHighlight < this.leftGrid.numRows) {
            const rightmost = this.leftGrid.findRightmostOccupied(rowToHighlight);
            if (rightmost >= 0) {
                for (let c = 0; c <= rightmost; c++) {
                    const cell = this.leftGrid.get(rowToHighlight, c);
                    this.leftGrid.set(rowToHighlight, c, { ch: cell.ch, hl: "LevelSelect" });
                }
            }
        }
        
        if (this.leftView) {
            this.leftView.update(this.leftGrid);
        }
    }

    /**
     * Updates the right view with current selection info.
     */
    private updateRightView(): void {
        if (!this.rightGrid) return;
        
        this.rightGrid = this.createInstructionsGrid(this.levels, this.selectedLevelIndex, this.player);
        if (this.rightView) {
            this.rightView.update(this.rightGrid);
        }
    }

    /**
     * Handles keyboard input for level selection.
     */
    private handleKeyPress = (event: KeyboardEvent) => {
        if (!this.controller || !this.leftView || !this.leftGrid) return;
        
        event.preventDefault();
        
        const oldIndex = this.selectedLevelIndex;
        this.controller.handleInput(event);
        
        // Update selected index based on cursor position
        const cursor = this.leftGrid.getCursor();
        // Exit option is at index levels.length (after all levels)
        const exitRowIndex = this.levels.length;
        if (cursor.row >= exitRowIndex) {
            // Selected the exit option
            this.selectedLevelIndex = this.levels.length; // Use levels.length as the exit index
        } else {
            // Selected a level
            const newIndex = Math.max(0, Math.min(cursor.row, this.levels.length - 1));
            this.selectedLevelIndex = newIndex;
        }
        
        // Keep cursor at column 0 for level list (only vertical navigation)
        if (cursor.col !== 0) {
            this.leftGrid.setCursor(cursor.row, 0);
        }
        
        // If selection changed, update highlights and right view
        if (oldIndex !== this.selectedLevelIndex) {
            this.updateHighlight();
            this.updateRightView();
        }
        
        // Update cursor display
        this.leftView.update(this.leftGrid);
        const newCursor = this.leftGrid.getCursor();
        this.leftView.setCursor(newCursor.row, newCursor.col);
    };

    /**
     * Handles Enter key to start the selected level or exit.
     */
    private handleEnter = () => {
        if (this.selectedLevelIndex === this.levels.length) {
            // Exit option selected - return to homepage
            this.exitToHome();
        } else if (this.selectedLevelIndex >= 0 && this.selectedLevelIndex < this.levels.length) {
            const selectedLevel = this.levels[this.selectedLevelIndex];
            // Stop the level select menu
            this.stop();
            // Start the selected level (GUI initialization happens in start())
            this.onLevelSelected(selectedLevel);
        }
    };
    
    /**
     * Exits to the homepage.
     */
    private exitToHome(): void {
        // Stop the level select menu
        this.stop();
        
        // Hide game view and show homepage
        document.body.classList.remove("game-active");
        const gameRoot = document.getElementById("game-root");
        if (gameRoot) {
            gameRoot.classList.remove("active");
        }
    }

    /**
     * Handles window resize events.
     */
    private handleResize = () => {
        if (this.stage) {
            this.stage.width(window.innerWidth);
            this.stage.height(window.innerHeight);
        }
    };

    /**
     * Initializes and displays the level select menu.
     */
    async start(): Promise<void> {
        // Hide homepage UI
        document.body.classList.add("game-active");
        
        // Show game container
        const gameRoot = document.getElementById("game-root");
        if (!gameRoot) return;
        gameRoot.classList.add("active");

        // Initialize Konva stage if not already done
        if (!this.menuInitialized) {
            // Load all levels (instantiates Level objects without GUI)
            this.levels = await LevelSelect.loadLevels();

            this.stage = new Konva.Stage({
                container: "game-root",
                width: window.innerWidth,
                height: window.innerHeight,
            });

            const layer = new Konva.Layer();
            this.stage.add(layer);

            // Create left grid (level list)
            this.leftGrid = this.createLevelListGrid(this.levels);
            const viewWidth = window.innerWidth / 2;
            const viewHeight = window.innerHeight;
            this.leftView = new GridView(this.leftGrid, viewWidth, viewHeight);
            
            // Create right grid (instructions)
            this.rightGrid = this.createInstructionsGrid(this.levels, this.selectedLevelIndex, this.player);
            this.rightView = new GridView(this.rightGrid, viewWidth, viewHeight);
            
            this.dualView = new DualGridView(this.leftView, this.rightView, viewWidth, viewHeight);
            layer.add(this.dualView.getGroup());

            // Set initial cursor position and highlight
            this.leftGrid.setCursor(0, 0);
            this.selectedLevelIndex = 0;
            this.updateHighlight();
            const cursor = this.leftGrid.getCursor();
            this.leftView.setCursor(cursor.row, cursor.col);
            layer.draw();

            // Create controller with Enter handler
            this.controller = new LevelSelectController(this.leftGrid, this.handleEnter);

            // Set up keyboard event listener
            window.addEventListener("keydown", this.handleKeyPress);
            window.addEventListener("resize", this.handleResize);
            
            this.menuInitialized = true;
        }
    }

    /**
     * Refreshes the level select view (updates scores, etc.)
     */
    refresh(): void {
        if (this.rightView && this.rightGrid && this.stage) {
            this.updateRightView();
            this.stage.getLayers()[0]?.draw();
        }
    }

    /**
     * Stops the level select menu and cleans up.
     */
    stop(): void {
        window.removeEventListener("keydown", this.handleKeyPress);
        window.removeEventListener("resize", this.handleResize);
        
        if (this.stage) {
            this.stage.destroy();
            this.stage = null;
        }
        
        this.menuInitialized = false;
    }
}

