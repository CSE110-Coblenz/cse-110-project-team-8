import VimGrid from "./VimGrid.js";
import { Mode, Cell} from "./VimGrid.js";

export class VimController {
    private grid: VimGrid;

    constructor(vimGrid: VimGrid) {
        this.grid = vimGrid;
    }

    handleInput(event: KeyboardEvent) {
        // Ignore modifier key combinations
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        if (event.key === "ArrowLeft") {
            this.moveCursorLeft();
            return;
        } else if (event.key === "ArrowRight") {
            this.moveCursorRight();
            return;
        } else if (event.key === "ArrowDown") {
            this.moveCursorDown();
            return;
        } else if (event.key === "ArrowUp") {
            this.moveCursorUp();
            return;
        }

        if (this.grid.getMode() === Mode.Insert) {
            if (event.key === "Escape") {
                this.grid.setMode(Mode.Normal);
                return;
            } else if (event.key === "Enter") {
                this.insertNewLine();
                return;
            } else if (event.key === "Backspace" || event.key === "Delete") {
                this.deleteText();
                return;
            }
            
            const key = event.key.toLowerCase();
            if (key === "h") {
                this.moveCursorLeft();
                return;
            } else if (key === "j") {
                this.moveCursorDown();
                return;
            } else if (key === "k") {
                this.moveCursorUp();
                return;
            } else if (key === "l") {
                this.moveCursorRight();
                return;
            } else if (event.key.length === 1) {
                const char = event.key;
                // Only insert if it's a printable ASCII character
                if (char >= ' ' && char <= '~') {
                    this.insertChar(char);
                }
            }
        } else if (this.grid.getMode() === Mode.Normal) {
            const key = event.key.toLowerCase();
            if (key === "i") {
                this.grid.setMode(Mode.Insert);
            } else if (key === "h") {
                this.moveCursorLeft();
            } else if (key === "j") {
                this.moveCursorDown();
            } else if (key === "k") {
                this.moveCursorUp();
            } else if (key === "l") {
                this.moveCursorRight();
            } else if (key === "0") {
                this.grid.moveCursorBy(0, -this.grid.numCols);
            } else if (event.shiftKey && event.key === "4") {
                this.grid.moveCursorBy(0, this.grid.numCols);
            }
        }
    }

    // Delete text at the cursor position
    private deleteText(): void {
        const { row, col } = this.grid.getCursor();
        if (col === 0) return;
        this.grid.set(row, col - 1, { ch: ' ' });
        this.grid.moveCursorBy(0, -1);
    }

    private insertChar(char: string): void {
        const { row, col } = this.grid.getCursor();
        if (col >= this.grid.numCols - 1) {
            this.grid.appendColumn();
        }
        
        // Shift all characters right
        const rightmost = this.grid.findRightmostOccupied(row);
        if (rightmost >= 0) {
            for (let c = rightmost; c >= col; c--) {
                const cell = this.grid.get(row, c);
                if (c + 1 >= this.grid.numCols) {
                    this.grid.appendColumn();
                }
                this.grid.set(row, c + 1, cell);
            }
        }
        
        this.grid.set(row, col, { ch: char });
        this.grid.moveCursorBy(0, 1);
    }

    // Insert a new line
    private insertNewLine(): void {
        const { row, col } = this.grid.getCursor();
        if (row + 1 >= this.grid.numRows) {
            this.grid.appendRow();
        }
        this.grid.addRow(row + 1);
        this.grid.setCursor(row + 1, 0);
    }

    // Move cursor down following vim rules
    private moveCursorDown(): void {
        const { row, col } = this.grid.getCursor();
        const newRow = Math.min(this.grid.numRows - 1, row + 1);
        const rightmost = this.grid.findRightmostOccupied(newRow);
        
        if (rightmost < 0) {
            this.grid.setCursor(newRow, 0);
        } else if (col <= rightmost) {
            this.grid.setCursor(newRow, col);
        } else {
            this.grid.setCursor(newRow, rightmost);
        }
    }

    // Move cursor up following vim rules
    private moveCursorUp(): void {
        const { row, col } = this.grid.getCursor();
        const newRow = Math.max(0, row - 1);
        const rightmost = this.grid.findRightmostOccupied(newRow);
        
        if (rightmost < 0) {
            this.grid.setCursor(newRow, 0);
        } else if (col <= rightmost) {
            this.grid.setCursor(newRow, col);
        } else {
            this.grid.setCursor(newRow, rightmost);
        }
    }

    // Move cursor left
    private moveCursorLeft(): void {
        const { row, col } = this.grid.getCursor();
        if (col > 0) {
            this.grid.moveCursorBy(0, -1);
        }
    }

    // Move cursor right
    private moveCursorRight(): void {
        const { row, col } = this.grid.getCursor();
        const rightmost = this.grid.findRightmostOccupied(row);
        
        if (this.grid.getMode() === Mode.Normal) {
            // Normal mode: can't go beyond rightmost filled cell
            if (rightmost < 0) return;
            if (col < rightmost) this.grid.moveCursorBy(0, 1);
        } else {
            // Insert mode: can move one cell beyond rightmost filled, but not on empty lines
            if (rightmost < 0) return;
            const maxCol = Math.min(rightmost + 1, this.grid.numCols - 1);
            if (col < maxCol) this.grid.moveCursorBy(0, 1);
        }
    }
}
