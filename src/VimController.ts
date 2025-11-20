import VimGrid from "./VimGrid.js";
import { Mode, Cell} from "./VimGrid.js";

// Special characters for tab representation
// Tab is represented as TAB_SIZE characters: TAB_LEFT, TAB_MIDDLE (multiple), TAB_RIGHT
// All are displayed as spaces, but cursor movement and deletion treat them as a unit
export const TAB_LEFT = '\uE000';   // Private Use Area character (leftmost, cursor can be here in Insert mode)
export const TAB_MIDDLE = '\uE001'; // Private Use Area character (middle, cursor can never be here)
export const TAB_RIGHT = '\uE002';  // Private Use Area character (rightmost, cursor can be here in Normal mode)
export const TAB_SIZE = 4;          // Number of cells in a tab

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
                this.adjustCursorForModeSwitch(Mode.Normal);
                return;
            } else if (event.key === "Enter") {
                this.insertNewLine();
                return;
            } else if (event.key === "Tab") {
                event.preventDefault(); // Prevent default tab behavior
                this.insertTab(); // Insert tab as special character set
                return;
            } else if (event.key === "Backspace") {
                this.deleteText();
            }
            
            const key = event.key.toLowerCase();
            if (event.key.length === 1) {
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
                this.adjustCursorForModeSwitch(Mode.Insert);
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

    // Helper methods for tab handling
    private isTabLeft(ch: string): boolean {
        return ch === TAB_LEFT;
    }

    private isTabMiddle(ch: string): boolean {
        return ch === TAB_MIDDLE;
    }

    private isTabRight(ch: string): boolean {
        return ch === TAB_RIGHT;
    }

    private isTabChar(ch: string): boolean {
        return ch === TAB_LEFT || ch === TAB_MIDDLE || ch === TAB_RIGHT;
    }

    // Find the start column of a tab (where TAB_LEFT is)
    private findTabStart(row: number, col: number): number | null {
        if (!this.grid.inBounds(row, col)) return null;
        
        const cell = this.grid.get(row, col);
        if (!this.isTabChar(cell.ch)) return null;
        
        // Search backwards to find TAB_LEFT
        for (let c = col; c >= 0; c--) {
            if (!this.grid.inBounds(row, c)) break;
            const cell = this.grid.get(row, c);
            if (this.isTabLeft(cell.ch)) {
                return c;
            }
            if (!this.isTabChar(cell.ch)) break;
        }
        return null;
    }

    // Find the end column of a tab (where TAB_RIGHT is)
    private findTabEnd(row: number, col: number): number | null {
        if (!this.grid.inBounds(row, col)) return null;
        
        const cell = this.grid.get(row, col);
        if (!this.isTabChar(cell.ch)) return null;
        
        // Search forwards to find TAB_RIGHT
        for (let c = col; c < this.grid.numCols; c++) {
            if (!this.grid.inBounds(row, c)) break;
            const cell = this.grid.get(row, c);
            if (this.isTabRight(cell.ch)) {
                return c;
            }
            if (!this.isTabChar(cell.ch)) break;
        }
        return null;
    }

    // Adjust cursor position when switching modes
    private adjustCursorForModeSwitch(newMode: Mode): void {
        const { row, col } = this.grid.getCursor();
        
        if (!this.grid.inBounds(row, col)) return;
        
        const cell = this.grid.get(row, col);
        if (!this.isTabChar(cell.ch)) return;
        
        if (newMode === Mode.Normal) {
            // Insert -> Normal: move to rightmost tab cell
            const tabEnd = this.findTabEnd(row, col);
            if (tabEnd !== null && tabEnd !== col) {
                this.grid.setCursor(row, tabEnd);
            }
        } else if (newMode === Mode.Insert) {
            // Normal -> Insert: move to leftmost tab cell
            const tabStart = this.findTabStart(row, col);
            if (tabStart !== null && tabStart !== col) {
                this.grid.setCursor(row, tabStart);
            }
        }
    }

    // Insert a tab (aligns to next multiple of TAB_SIZE)
    private insertTab(): void {
        const { row, col } = this.grid.getCursor();
        
            // Calculate the next tab stop (next multiple of TAB_SIZE from column 0)
        const nextTabStop = Math.ceil((col + 1) / TAB_SIZE) * TAB_SIZE;
        const distance = nextTabStop - col;
        
        // If distance is 1, just insert a space instead of a tab
        if (distance === 1) {
            this.insertChar(' ');
            return;
        }
        
        // Find the rightmost occupied cell to determine how many columns we need
        const rightmost = this.grid.findRightmostOccupied(row);
        const maxNeededCol = rightmost >= 0 ? Math.max(nextTabStop, rightmost + distance) : nextTabStop;
        
        // Ensure we have enough columns for the entire operation
        while (this.grid.numCols <= maxNeededCol) {
            this.grid.appendColumn();
        }
        
        // Shift all characters right by distance (iterate backwards to avoid overwriting)
        if (rightmost >= 0 && rightmost >= col) {
            for (let c = rightmost; c >= col; c--) {
                const cell = this.grid.get(row, c);
                this.grid.set(row, c + distance, cell);
            }
        }
        
        // Insert tab characters: TAB_LEFT, TAB_MIDDLE (if needed), TAB_RIGHT
        // Minimum is 2 characters (TAB_LEFT and TAB_RIGHT)
        this.grid.set(row, col, { ch: TAB_LEFT });
        
        if (distance > 2) {
            // Insert middle characters if distance > 2
            for (let i = 1; i < distance - 1; i++) {
                this.grid.set(row, col + i, { ch: TAB_MIDDLE });
            }
        }
        
        // TAB_RIGHT is always at the last position (nextTabStop - 1)
        this.grid.set(row, nextTabStop - 1, { ch: TAB_RIGHT });
        
        // Move cursor position after inserting tab
        if (this.grid.getMode() === Mode.Insert) {
            // In Insert mode, cursor moves one cell to the right of the tab
            const newCol = nextTabStop;
            // Ensure we have enough columns
            while (this.grid.numCols <= newCol) {
                this.grid.appendColumn();
            }
            this.grid.setCursor(row, newCol);
        } else {
            // In Normal mode, cursor goes to rightmost tab cell (TAB_RIGHT)
            this.grid.setCursor(row, nextTabStop - 1);
        }
    }

    // Delete text at the cursor position
    private deleteText(): void {
        const { row, col } = this.grid.getCursor();

        if (col === 0 && row > 0) {
            const prevRow = row - 1;
            const prevRightmost = this.grid.findRightmostOccupied(prevRow);
            const currentRightmost = this.grid.findRightmostOccupied(row);
            
            const appendStartCol = prevRightmost >= 0 ? prevRightmost + 1 : 0;
            
            if (currentRightmost >= 0) {
                const neededCols = appendStartCol + (currentRightmost + 1);
                while (this.grid.numCols <= neededCols) {
                    this.grid.appendColumn();
                }

                for (let c = 0; c <= currentRightmost; c++) {
                    const cell = this.grid.get(row, c);
                    this.grid.set(prevRow, appendStartCol + c, cell);
                }
            }
            
            this.grid.removeRow(row);
            
            const targetCol = appendStartCol;
            if (this.grid.getMode() === Mode.Insert && targetCol >= this.grid.numCols) {
                this.grid.appendColumn();
            }
            this.grid.setCursor(prevRow, targetCol);
            return;
        }
        
        if (col === 0) return;
        
        // Check if we're deleting a tab character
        const cellToDelete = this.grid.get(row, col - 1);
        if (this.isTabChar(cellToDelete.ch)) {
            // Find the start of the tab
            const tabStart = this.findTabStart(row, col - 1);
            if (tabStart !== null) {
                // Delete all tab characters (TAB_SIZE characters)
                const rightmost = this.grid.findRightmostOccupied(row);
                if (rightmost >= 0) {
                    for (let c = tabStart; c <= rightmost; c++) {
                        if (c + TAB_SIZE < this.grid.numCols) {
                            const cell = this.grid.get(row, c + TAB_SIZE);
                            this.grid.set(row, c, cell);
                        } else {
                            this.grid.set(row, c, { ch: '' });
                        }
                    }
                }
                // Move cursor back by TAB_SIZE, but ensure we don't go negative
                const newCol = Math.max(0, col - TAB_SIZE);
                this.grid.setCursor(row, newCol);
                return;
            }
        }
        
        // Normal character deletion
        const rightmost = this.grid.findRightmostOccupied(row);
        if (rightmost >= 0 && col - 1 <= rightmost) {
            for (let c = col - 1; c <= rightmost; c++) {
                if (c + 1 < this.grid.numCols) {
                    const cell = this.grid.get(row, c + 1);
                    this.grid.set(row, c, cell);
                } else {
                    this.grid.set(row, c, { ch: '' });
                }
            }
        }
        
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
        
        // Find the rightmost occupied cell in the current line
        const rightmost = this.grid.findRightmostOccupied(row);
        
        // If there's content to the right of the cursor, move it to the new line
        if (rightmost >= 0 && col <= rightmost) {
            // Calculate how many characters need to be moved
            const charsToMove = rightmost - col + 1;
            
            // Ensure we have enough rows
            if (row + 1 >= this.grid.numRows) {
                this.grid.appendRow();
            }
            
            // Insert a new row
            this.grid.addRow(row + 1);
            
            // Move content from cursor position to end of line to the new line
            for (let c = col; c <= rightmost; c++) {
                const cell = this.grid.get(row, c);
                const newCol = c - col;
                
                // Ensure we have enough columns in the new line
                while (this.grid.numCols <= newCol) {
                    this.grid.appendColumn();
                }
                
                this.grid.set(row + 1, newCol, cell);
                // Clear the original cell
                this.grid.set(row, c, { ch: '' });
            }
        } else {
            // No content to move, just insert a new empty line
            if (row + 1 >= this.grid.numRows) {
                this.grid.appendRow();
            }
            this.grid.addRow(row + 1);
        }
        
        // Move cursor to the new line at column 0
        this.grid.setCursor(row + 1, 0);
    }

    // Move cursor down following vim rules
    private moveCursorDown(): void {
        const { row, col } = this.grid.getCursor();
        const newRow = Math.min(this.grid.numRows - 1, row + 1);
        const rightmost = this.grid.findRightmostOccupied(newRow);
        const currentRightmost = this.grid.findRightmostOccupied(row);
        
        if (rightmost < 0) {
            this.grid.setCursor(newRow, 0);
        } else if (col <= rightmost) {
            // Check if we're landing on a tab character
            if (col < this.grid.numCols) {
                const cell = this.grid.get(newRow, col);
                if (this.isTabMiddle(cell.ch)) {
                    // Never land on middle - move to appropriate end based on mode
                    if (this.grid.getMode() === Mode.Insert) {
                        const tabStart = this.findTabStart(newRow, col);
                        if (tabStart !== null) this.grid.setCursor(newRow, tabStart);
                    } else {
                        const tabEnd = this.findTabEnd(newRow, col);
                        if (tabEnd !== null) this.grid.setCursor(newRow, tabEnd);
                    }
                } else if (this.isTabLeft(cell.ch) && this.grid.getMode() === Mode.Normal) {
                    // In Normal mode, move to TAB_RIGHT
                    const tabEnd = this.findTabEnd(newRow, col);
                    if (tabEnd !== null) this.grid.setCursor(newRow, tabEnd);
                } else if (this.isTabRight(cell.ch) && this.grid.getMode() === Mode.Insert) {
                    // In Insert mode, move to TAB_LEFT
                    const tabStart = this.findTabStart(newRow, col);
                    if (tabStart !== null) this.grid.setCursor(newRow, tabStart);
                } else {
                    this.grid.setCursor(newRow, col);
                }
            } else {
                this.grid.setCursor(newRow, col);
            }
        } else {
            // Cursor is beyond the rightmost filled cell in the new line
            if (this.grid.getMode() === Mode.Insert) {
                // In Insert mode, if moving from a longer/equal line to a shorter/equal line,
                // allow cursor to be one cell to the right of rightmost
                if (currentRightmost >= 0 && rightmost <= currentRightmost) {
                    const targetCol = Math.min(rightmost + 1, this.grid.numCols - 1);
                    this.grid.setCursor(newRow, targetCol);
                } else {
                    this.grid.setCursor(newRow, rightmost);
                }
            } else {
                // Normal mode: go to rightmost filled cell
                this.grid.setCursor(newRow, rightmost);
            }
        }
    }

    // Move cursor up following vim rules
    private moveCursorUp(): void {
        const { row, col } = this.grid.getCursor();
        const newRow = Math.max(0, row - 1);
        const rightmost = this.grid.findRightmostOccupied(newRow);
        const currentRightmost = this.grid.findRightmostOccupied(row);
        
        if (rightmost < 0) {
            this.grid.setCursor(newRow, 0);
        } else if (col <= rightmost) {
            // Check if we're landing on a tab character
            if (col < this.grid.numCols) {
                const cell = this.grid.get(newRow, col);
                if (this.isTabMiddle(cell.ch)) {
                    // Never land on middle - move to appropriate end based on mode
                    if (this.grid.getMode() === Mode.Insert) {
                        const tabStart = this.findTabStart(newRow, col);
                        if (tabStart !== null) this.grid.setCursor(newRow, tabStart);
                    } else {
                        const tabEnd = this.findTabEnd(newRow, col);
                        if (tabEnd !== null) this.grid.setCursor(newRow, tabEnd);
                    }
                } else if (this.isTabLeft(cell.ch) && this.grid.getMode() === Mode.Normal) {
                    // In Normal mode, move to TAB_RIGHT
                    const tabEnd = this.findTabEnd(newRow, col);
                    if (tabEnd !== null) this.grid.setCursor(newRow, tabEnd);
                } else if (this.isTabRight(cell.ch) && this.grid.getMode() === Mode.Insert) {
                    // In Insert mode, move to TAB_LEFT
                    const tabStart = this.findTabStart(newRow, col);
                    if (tabStart !== null) this.grid.setCursor(newRow, tabStart);
                } else {
                    this.grid.setCursor(newRow, col);
                }
            } else {
                this.grid.setCursor(newRow, col);
            }
        } else {
            // Cursor is beyond the rightmost filled cell in the new line
            if (this.grid.getMode() === Mode.Insert) {
                // In Insert mode, if moving from a longer/equal line to a shorter/equal line,
                // allow cursor to be one cell to the right of rightmost
                if (currentRightmost >= 0 && rightmost <= currentRightmost) {
                    const targetCol = Math.min(rightmost + 1, this.grid.numCols - 1);
                    this.grid.setCursor(newRow, targetCol);
                } else {
                    this.grid.setCursor(newRow, rightmost);
                }
            } else {
                // Normal mode: go to rightmost filled cell
                this.grid.setCursor(newRow, rightmost);
            }
        }
    }

    // Move cursor left
    private moveCursorLeft(): void {
        const { row, col } = this.grid.getCursor();
        if (col > 0) {
            const currentCell = this.grid.get(row, col);
            
            // If we're on a tab character, move to the appropriate position
            if (this.isTabChar(currentCell.ch)) {
                const tabStart = this.findTabStart(row, col);
                if (tabStart !== null && tabStart < col) {
                    // Move to left of tab (or to TAB_LEFT if in Insert mode)
                    if (this.grid.getMode() === Mode.Insert) {
                        this.grid.setCursor(row, tabStart);
                    } else {
                        // In Normal mode, move to just before the tab
                        this.grid.setCursor(row, tabStart - 1 >= 0 ? tabStart - 1 : 0);
                    }
                    return;
                }
            }
            
            // Normal movement
            this.grid.moveCursorBy(0, -1);
            
            // Check if we landed on a tab character and adjust
            const newCol = col - 1;
            if (newCol >= 0) {
                const cell = this.grid.get(row, newCol);
                if (this.isTabMiddle(cell.ch)) {
                    // Never land on middle - move to appropriate end
                    if (this.grid.getMode() === Mode.Insert) {
                        const tabStart = this.findTabStart(row, newCol);
                        if (tabStart !== null) this.grid.setCursor(row, tabStart);
                    } else {
                        const tabEnd = this.findTabEnd(row, newCol);
                        if (tabEnd !== null) this.grid.setCursor(row, tabEnd);
                    }
                } else if (this.isTabRight(cell.ch) && this.grid.getMode() === Mode.Insert) {
                    // In Insert mode, move to TAB_LEFT
                    const tabStart = this.findTabStart(row, newCol);
                    if (tabStart !== null) this.grid.setCursor(row, tabStart);
                } else if (this.isTabLeft(cell.ch) && this.grid.getMode() === Mode.Normal) {
                    // In Normal mode, move to TAB_RIGHT
                    const tabEnd = this.findTabEnd(row, newCol);
                    if (tabEnd !== null) this.grid.setCursor(row, tabEnd);
                }
            }
        }
    }

    // Move cursor right
    private moveCursorRight(): void {
        const { row, col } = this.grid.getCursor();
        const rightmost = this.grid.findRightmostOccupied(row);
        
        const currentCell = this.grid.get(row, col);
        
        // If we're on a tab character, move to the appropriate position
        if (this.isTabChar(currentCell.ch)) {
            const tabEnd = this.findTabEnd(row, col);
            if (tabEnd !== null && tabEnd > col) {
                // Move to right of tab (or to TAB_RIGHT if in Normal mode)
                if (this.grid.getMode() === Mode.Normal) {
                    this.grid.setCursor(row, tabEnd);
                } else {
                    // In Insert mode, move to just after the tab
                    const nextCol = tabEnd + 1;
                    if (nextCol < this.grid.numCols) {
                        this.grid.setCursor(row, nextCol);
                    } else {
                        this.grid.setCursor(row, tabEnd);
                    }
                }
                return;
            }
        }
        
        if (this.grid.getMode() === Mode.Normal) {
            // Normal mode: can't go beyond rightmost filled cell
            if (rightmost < 0) return;
            if (col < rightmost) {
                this.grid.moveCursorBy(0, 1);
                // Check if we landed on a tab character and adjust
                const newCol = col + 1;
                if (newCol < this.grid.numCols) {
                    const cell = this.grid.get(row, newCol);
                    if (this.isTabMiddle(cell.ch)) {
                        // Never land on middle - move to TAB_RIGHT
                        const tabEnd = this.findTabEnd(row, newCol);
                        if (tabEnd !== null) this.grid.setCursor(row, tabEnd);
                    } else if (this.isTabLeft(cell.ch)) {
                        // In Normal mode, move to TAB_RIGHT
                        const tabEnd = this.findTabEnd(row, newCol);
                        if (tabEnd !== null) this.grid.setCursor(row, tabEnd);
                    }
                }
            }
        } else {
            // Insert mode: can move one cell beyond rightmost filled, but not on empty lines
            if (rightmost < 0) return;
            const maxCol = Math.min(rightmost + 1, this.grid.numCols - 1);
            if (col < maxCol) {
                this.grid.moveCursorBy(0, 1);
                // Check if we landed on a tab character and adjust
                const newCol = col + 1;
                if (newCol < this.grid.numCols) {
                    const cell = this.grid.get(row, newCol);
                    if (this.isTabMiddle(cell.ch)) {
                        // Never land on middle - move to TAB_LEFT
                        const tabStart = this.findTabStart(row, newCol);
                        if (tabStart !== null) this.grid.setCursor(row, tabStart);
                    } else if (this.isTabRight(cell.ch)) {
                        // In Insert mode, move to TAB_LEFT
                        const tabStart = this.findTabStart(row, newCol);
                        if (tabStart !== null) this.grid.setCursor(row, tabStart);
                    }
                }
            }
        }
    }
}
