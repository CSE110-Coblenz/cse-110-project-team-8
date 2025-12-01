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
    private commandBuffer: string = ""; // Command buffer (can include numbers and command chars)

    constructor(vimGrid: VimGrid) {
        this.grid = vimGrid;
    }

    /**
     * Clears the command buffer.
     */
    private clearCommandBuffer(): void {
        this.commandBuffer = "";
    }

    /**
     * Checks if a command string is a partial command (could become valid with more input).
     */
    private isPartialCommand(cmd: string): boolean {
        // Numbers are partial (waiting for a command)
        if (/^\d+$/.test(cmd)) {
            return true;
        }
        // Commands that can be extended: d, y, c, g (for dd, yy, cc, gj, gk, etc.)
        return cmd === "d" || cmd === "y" || cmd === "c" || cmd === "g";
    }

    /**
     * Checks if a command string is a valid real command.
     */
    private isRealCommand(cmd: string): boolean {
        return cmd === "i" || cmd === "h" || cmd === "j" || cmd === "k" || cmd === "l" || 
               cmd === "0" || cmd === "dd" || cmd === "gj" || cmd === "gk";
    }

    /**
     * Parses the repeat count from the beginning of a command string.
     * Returns { count: number, command: string } where count is the repeat count and command is the remaining command.
     */
    private parseRepeatCount(cmd: string): { count: number; command: string } {
        let count = 1;
        let command = cmd;
        
        // Extract leading digits
        const match = cmd.match(/^(\d+)(.*)$/);
        if (match) {
            const parsedCount = parseInt(match[1], 10);
            if (!isNaN(parsedCount) && parsedCount > 0) {
                count = parsedCount;
                command = match[2];
            }
        }
        
        return { count, command };
    }

    /**
     * Handles a command string with repeat count.
     */
    private executeCommand(cmd: string, count: number): void {
        switch (cmd) {
            case "i":
                this.grid.setMode(Mode.Insert);
                this.adjustCursorForModeSwitch(Mode.Insert);
                break;
            case "h":
                for (let i = 0; i < count; i++) this.moveCursorLeft();
                break;
            case "j":
                for (let i = 0; i < count; i++) this.moveCursorDown();
                break;
            case "k":
                for (let i = 0; i < count; i++) this.moveCursorUp();
                break;
            case "l":
                for (let i = 0; i < count; i++) this.moveCursorRight();
                break;
            case "0":
                this.grid.moveCursorBy(0, -this.grid.numCols);
                break;
            case "dd":
                for (let i = 0; i < count; i++) this.deleteLine();
                break;
            case "gj":
                for (let i = 0; i < count; i++) this.moveCursorDown();
                break;
            case "gk":
                for (let i = 0; i < count; i++) this.moveCursorUp();
                break;
        }
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
            
            if (event.key.length === 1) {
                const char = event.key;
                // Only insert if it's a printable ASCII character
                if (char >= ' ' && char <= '~') {
                    this.insertChar(char);
                }
            }
        } else if (this.grid.getMode() === Mode.Normal) {
            const key = event.key.toLowerCase();
            
            // Handle "$" (shift+4) - go to end of line (special case, doesn't go in buffer)
            if (event.shiftKey && event.key === "4") {
                this.grid.moveCursorBy(0, this.grid.numCols);
                return;
            }
            
            // Handle "0" - it's a number if buffer has digits, otherwise it's a command
            if (key === "0") {
                if (this.commandBuffer !== "" && /^\d+$/.test(this.commandBuffer)) {
                    // Part of a number prefix (e.g., "10")
                    this.commandBuffer += key;
                    return;
                } else {
                    // Standalone "0" command - execute immediately
                    this.executeCommand("0", 1);
                    return;
                }
            }
            
            // 1. Modify buffer
            this.commandBuffer += key;
            
            // 2. Strip (and store) count
            const { count, command } = this.parseRepeatCount(this.commandBuffer);
            
            // 3. Handle buffer command
            if (this.isRealCommand(command)) {
                // Category 1: Real command -> handle accordingly and flush buffer
                this.executeCommand(command, count);
                this.clearCommandBuffer();
            } else if (command === "" && count > 1) {
                // Category 2: Just a number prefix (waiting for command) -> do nothing and wait for next input
                return;
            } else if (this.isPartialCommand(command)) {
                // Category 2: Partial command -> do nothing and wait for next input
                return;
            } else {
                // Category 3: Not a real command -> do nothing and flush buffer
                this.clearCommandBuffer();
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
        
        // If we're already on TAB_LEFT, return it
        if (this.isTabLeft(cell.ch)) {
            return col;
        }
        
        // Search backwards to find TAB_LEFT
        for (let c = col - 1; c >= 0; c--) {
            if (!this.grid.inBounds(row, c)) break;
            const cell = this.grid.get(row, c);
            if (this.isTabLeft(cell.ch)) {
                return c;
            }
            // If we hit a non-tab character, we've gone too far
            if (!this.isTabChar(cell.ch)) break;
        }
        return null;
    }

    // Find the end column of a tab (where TAB_RIGHT is)
    private findTabEnd(row: number, col: number): number | null {
        if (!this.grid.inBounds(row, col)) return null;
        
        const cell = this.grid.get(row, col);
        if (!this.isTabChar(cell.ch)) return null;
        
        // If we're already on TAB_RIGHT, return it
        if (this.isTabRight(cell.ch)) {
            return col;
        }
        
        // Search forwards to find TAB_RIGHT
        for (let c = col + 1; c < this.grid.numCols; c++) {
            if (!this.grid.inBounds(row, c)) break;
            const cell = this.grid.get(row, c);
            if (this.isTabRight(cell.ch)) {
                return c;
            }
            // If we hit a non-tab character, we've gone too far
            if (!this.isTabChar(cell.ch)) break;
        }
        return null;
    }

    // Check if a column is within a tab and return the appropriate tab cell position
    private getValidTabPosition(row: number, col: number): number | null {
        if (!this.grid.inBounds(row, col)) return null;
        
        const cell = this.grid.get(row, col);
        if (!this.isTabChar(cell.ch)) return null;
        
        // We're on a tab character - find the appropriate position based on mode
        const mode = this.grid.getMode();
        
        if (mode === Mode.Insert) {
            // Insert mode: jump to TAB_LEFT
            // First check if we're already on TAB_LEFT
            if (this.isTabLeft(cell.ch)) {
                return col; // Already at the correct position
            }
            // Search backwards to find TAB_LEFT (search up to TAB_SIZE * 2 to handle edge cases)
            for (let c = col - 1; c >= Math.max(0, col - TAB_SIZE * 2); c--) {
                if (!this.grid.inBounds(row, c)) break;
                const checkCell = this.grid.get(row, c);
                if (this.isTabLeft(checkCell.ch)) {
                    return c;
                }
                // If we hit a non-tab character, we've gone too far
                if (!this.isTabChar(checkCell.ch)) break;
            }
            // If we still haven't found it, try using findTabStart as a fallback
            const tabStart = this.findTabStart(row, col);
            if (tabStart !== null) {
                return tabStart;
            }
        } else {
            // Normal mode: jump to TAB_RIGHT
            // First check if we're already on TAB_RIGHT
            if (this.isTabRight(cell.ch)) {
                return col; // Already at the correct position
            }
            // Search forwards to find TAB_RIGHT (search up to TAB_SIZE * 2 to handle edge cases)
            for (let c = col + 1; c < Math.min(this.grid.numCols, col + TAB_SIZE * 2); c++) {
                if (!this.grid.inBounds(row, c)) break;
                const checkCell = this.grid.get(row, c);
                if (this.isTabRight(checkCell.ch)) {
                    return c;
                }
                // If we hit a non-tab character, we've gone too far
                if (!this.isTabChar(checkCell.ch)) break;
            }
            // If we still haven't found it, try using findTabEnd as a fallback
            const tabEnd = this.findTabEnd(row, col);
            if (tabEnd !== null) {
                return tabEnd;
            }
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
            // Insert a new row at row + 1
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
        
        // Preserve virtual column, but display at rightmost valid if virtual column is beyond line
        // Don't update virtual column when moving up/down
        const virtualCol = this.grid.getVirtualColumn();
        
        if (rightmost < 0) {
            // Empty line - display at column 0, but preserve virtual column
            this.grid.setCursor(newRow, 0, false);
        } else {
            // Use virtual column if valid, otherwise use rightmost valid
            const maxCol = this.grid.getMode() === Mode.Insert ? Math.min(rightmost + 1, this.grid.numCols - 1) : rightmost;
            const displayCol = virtualCol <= maxCol ? virtualCol : maxCol;
            
            // Check if display column is within a tab, and jump to appropriate tab cell based on mode
            let finalCol = displayCol;
            if (displayCol < this.grid.numCols && displayCol >= 0 && this.grid.inBounds(newRow, displayCol)) {
                const cell = this.grid.get(newRow, displayCol);
                if (this.isTabChar(cell.ch)) {
                    const validTabPos = this.getValidTabPosition(newRow, displayCol);
                    if (validTabPos !== null) {
                        // We're landing on a tab - jump to the appropriate tab cell based on mode
                        // Always jump, even if it's the same position (handles TAB_MIDDLE case)
                        finalCol = validTabPos;
                    }
                }
            }
            
            // Set cursor without updating virtual column
            this.grid.setCursor(newRow, finalCol, false);
        }
    }

    // Move cursor up following vim rules
    private moveCursorUp(): void {
        const { row } = this.grid.getCursor();
        const newRow = Math.max(0, row - 1);
        const rightmost = this.grid.findRightmostOccupied(newRow);
        
        // Preserve virtual column, but display at rightmost valid if virtual column is beyond line
        // Don't update virtual column when moving up/down
        const virtualCol = this.grid.getVirtualColumn();
        
        if (rightmost < 0) {
            // Empty line - display at column 0, but preserve virtual column
            this.grid.setCursor(newRow, 0, false);
        } else {
            // Use virtual column if valid, otherwise use rightmost valid
            const maxCol = this.grid.getMode() === Mode.Insert ? Math.min(rightmost + 1, this.grid.numCols - 1) : rightmost;
            const displayCol = virtualCol <= maxCol ? virtualCol : maxCol;
            
            // Check if display column is within a tab, and jump to appropriate tab cell based on mode
            let finalCol = displayCol;
            if (displayCol < this.grid.numCols && displayCol >= 0 && this.grid.inBounds(newRow, displayCol)) {
                const cell = this.grid.get(newRow, displayCol);
                if (this.isTabChar(cell.ch)) {
                    const validTabPos = this.getValidTabPosition(newRow, displayCol);
                    if (validTabPos !== null) {
                        // We're landing on a tab - jump to the appropriate tab cell based on mode
                        // Always jump, even if it's the same position (handles TAB_MIDDLE case)
                        finalCol = validTabPos;
                    }
                }
            }
            
            // Set cursor without updating virtual column
            this.grid.setCursor(newRow, finalCol, false);
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

    /**
     * Deletes the current line (dd command).
     */
    private deleteLine(): void {
        const { row } = this.grid.getCursor();
        if (row < 0 || row >= this.grid.numRows) return;
        
        this.grid.removeRow(row);
        // Adjust cursor if we deleted the last line
        if (this.grid.numRows > 0) {
            const newRow = Math.min(row, this.grid.numRows - 1);
            this.grid.setCursor(newRow, 0);
        }
    }
}
