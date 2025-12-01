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
        // Commands that can be extended: d, y, c, g, r (for dd, yy, cc, gj, gk, gg, ge, gE, r{char}, etc.)
        // Only return true if it's exactly "d", "y", "c", "g", or "r" (case-sensitive)
        return cmd === "d" || cmd === "y" || cmd === "c" || cmd === "g" || cmd === "r";
    }

    /**
     * Checks if a command string is a valid real command.
     */
    private isRealCommand(cmd: string): boolean {
        // Check for r{char} pattern (r followed by exactly one character)
        if (cmd.length === 2 && cmd[0] === "r") {
            return true;
        }
        return cmd === "i" || cmd === "I" || cmd === "h" || cmd === "j" || cmd === "k" || cmd === "l" || 
               cmd === "0" || cmd === "dd" || cmd === "gj" || cmd === "gk" || cmd === "H" || cmd === "G" || 
               cmd === "M" || cmd === "L" || cmd === "gg" || cmd === "w" || cmd === "W" || 
               cmd === "e" || cmd === "E" || cmd === "b" || cmd === "B" || cmd === "ge" || cmd === "gE" ||
               cmd === "x";
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
            case "I":
                // Move to beginning of line (column 0) and switch to Insert mode
                const { row } = this.grid.getCursor();
                this.grid.setCursor(row, 0);
                
                // Check if we're on a tab character and adjust for Insert mode
                if (this.grid.inBounds(row, 0)) {
                    const cell = this.grid.get(row, 0);
                    if (this.isTabChar(cell.ch)) {
                        // If we're on a tab, move to TAB_LEFT (correct position for Insert mode)
                        const tabStart = this.findTabStart(row, 0);
                        if (tabStart !== null) {
                            this.grid.setCursor(row, tabStart);
                        }
                    }
                }
                
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
            case "H":
                // Jump to line 1 (since we don't do scrolling)
                this.jumpToLine(1);
                break;
            case "M":
                // Jump to middle line
                this.jumpToLine(Math.floor(this.grid.numRows / 2) + 1);
                break;
            case "L":
                // Jump to last line (same as G)
                this.jumpToLine(0);
                break;
            case "gg":
                if (count === 1) {
                    this.jumpToLine(1);
                } else {
                    // For ngg where n > 1, treat same as G
                    this.jumpToLine(count);
                }
                break;
            case "G":
                // Jump to line (count=1 means last line, otherwise jump to line count)
                // For G, we want count=1 to go to last line (0), not line 1
                if (count === 1) {
                    this.jumpToLine(0);
                } else {
                    this.jumpToLine(count);
                }
                break;
            case "w":
                for (let i = 0; i < count; i++) this.moveWordForward();
                break;
            case "W":
                for (let i = 0; i < count; i++) this.moveWORDForward();
                break;
            case "e":
                for (let i = 0; i < count; i++) this.moveWordEndForward();
                break;
            case "E":
                for (let i = 0; i < count; i++) this.moveWORDEndForward();
                break;
            case "b":
                for (let i = 0; i < count; i++) this.moveWordBackward();
                break;
            case "B":
                for (let i = 0; i < count; i++) this.moveWORDBackward();
                break;
            case "ge":
                for (let i = 0; i < count; i++) this.moveWordEndBackward();
                break;
            case "gE":
                for (let i = 0; i < count; i++) this.moveWORDEndBackward();
                break;
            case "x":
                for (let i = 0; i < count; i++) this.deleteChar();
                break;
            default:
                // Handle r{char} pattern - replace character at cursor
                if (cmd.length === 2 && cmd[0] === "r") {
                    this.replaceChars(cmd[1], count);
                }
                break;
        }
    }

    /**
     * Jumps to the specified line number and positions cursor at leftmost non-whitespace.
     * @param lineNumber - Line number to jump to (1-indexed, or 0 for last line)
     */
    private jumpToLine(lineNumber: number): void {
        // If lineNumber is 0, jump to last line
        // Otherwise, jump to lineNumber (1-indexed, so subtract 1)
        const targetLine = (lineNumber === 0) 
            ? this.grid.numRows - 1 
            : Math.min(lineNumber - 1, this.grid.numRows - 1);
        
        // Clamp to valid range
        const clampedLine = Math.max(0, Math.min(targetLine, this.grid.numRows - 1));
        
        // Find the leftmost non-whitespace character on the line (tabs count as whitespace)
        let leftmostNonWhitespace = -1;
        let rightmostWhitespace = -1;
        let rightmostTabStart = -1; // Start column of rightmost tab
        
        for (let col = 0; col < this.grid.numCols; col++) {
            const cell = this.grid.get(clampedLine, col);
            if (cell && cell.ch !== undefined && cell.ch !== null) {
                const ch = cell.ch;
                // Check if it's a tab character
                const isTab = ch === TAB_LEFT || ch === TAB_MIDDLE || ch === TAB_RIGHT;
                // Check if it's whitespace (space, tab, etc.)
                const isWhitespace = ch.trim() === "" || isTab;
                
                if (!isWhitespace) {
                    // Found non-whitespace character
                    if (leftmostNonWhitespace === -1) {
                        leftmostNonWhitespace = col;
                    }
                } else {
                    // Track rightmost whitespace
                    rightmostWhitespace = col;
                    
                    // If it's a tab start, track it
                    if (ch === TAB_LEFT) {
                        rightmostTabStart = col;
                    }
                }
            }
        }
        
        // Determine target column:
        // - If there's a non-whitespace character, move to leftmost non-whitespace
        // - If there's only whitespace:
        //   - If there's a tab, go to leftmost character in rightmost tab (TAB_LEFT)
        //   - Otherwise, go to rightmost whitespace
        let targetCol: number;
        if (leftmostNonWhitespace >= 0) {
            // Move to leftmost non-whitespace character
            targetCol = leftmostNonWhitespace;
        } else if (rightmostTabStart >= 0) {
            // All whitespace with tabs - go to leftmost character in rightmost tab
            targetCol = rightmostTabStart;
        } else if (rightmostWhitespace >= 0) {
            // All whitespace (no tabs) - go to rightmost whitespace
            targetCol = rightmostWhitespace;
        } else {
            // Empty line - move to column 0
            targetCol = 0;
        }
        
        this.grid.setCursor(clampedLine, targetCol);
    }

    /**
     * Checks if a character is a word character (letter, digit, or underscore).
     */
    private isWordChar(ch: string): boolean {
        if (!ch || ch.length === 0) return false;
        return /[a-zA-Z0-9_]/.test(ch);
    }

    /**
     * Checks if a character is a non-blank character (not space or tab).
     */
    private isNonBlank(ch: string): boolean {
        if (!ch || ch.length === 0) return false;
        // Check if it's a tab character
        if (ch === TAB_LEFT || ch === TAB_MIDDLE || ch === TAB_RIGHT) return false;
        return ch.trim() !== "";
    }

    /**
     * Gets the character at a given position, or empty string if out of bounds.
     */
    private getCharAt(row: number, col: number): string {
        if (!this.grid.inBounds(row, col)) return "";
        return this.grid.get(row, col).ch || "";
    }

    /**
     * Moves forward to the start of the next word (w).
     */
    private moveWordForward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the end of file, do nothing
        if (row >= this.grid.numRows - 1 && col >= this.grid.numCols - 1) return;
        
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a word, move to end of current word
        if (this.isWordChar(currentCh)) {
            // Move to end of current word
            while (col < this.grid.numCols && this.isWordChar(this.getCharAt(row, col))) {
                col++;
            }
        } else if (currentCh && currentCh.trim() !== "" && !this.isWordChar(currentCh)) {
            // If we're on punctuation, it's its own word - skip it
            col++;
        }
        
        // Skip whitespace and find next word or punctuation
        while (row < this.grid.numRows) {
            while (col < this.grid.numCols) {
                const ch = this.getCharAt(row, col);
                if (this.isWordChar(ch)) {
                    // Found start of next word
                    this.grid.setCursor(row, col);
                    return;
                }
                // If it's punctuation (non-whitespace, non-word), it's its own word
                if (ch && ch.trim() !== "" && !this.isWordChar(ch)) {
                    this.grid.setCursor(row, col);
                    return;
                }
                col++;
            }
            // Move to next line
            row++;
            col = 0;
            if (row >= this.grid.numRows) break;
        }
    }

    /**
     * Moves forward to the start of the next WORD (W).
     */
    private moveWORDForward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the end of file, do nothing
        if (row >= this.grid.numRows - 1 && col >= this.grid.numCols - 1) return;
        
        // Skip current WORD if we're in one
        const currentCh = this.getCharAt(row, col);
        if (this.isNonBlank(currentCh)) {
            // Move to end of current WORD
            while (col < this.grid.numCols && this.isNonBlank(this.getCharAt(row, col))) {
                col++;
            }
        }
        
        // Skip whitespace
        while (row < this.grid.numRows) {
            while (col < this.grid.numCols) {
                const ch = this.getCharAt(row, col);
                if (this.isNonBlank(ch)) {
                    // Found start of next WORD
                    this.grid.setCursor(row, col);
                    return;
                }
                col++;
            }
            // Move to next line
            row++;
            col = 0;
            if (row >= this.grid.numRows) break;
        }
    }

    /**
     * Moves forward to the end of the current/next word (e).
     */
    private moveWordEndForward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the end of file, do nothing
        if (row >= this.grid.numRows - 1 && col >= this.grid.numCols - 1) return;
        
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a word, check if we're already at the end
        if (this.isWordChar(currentCh)) {
            // Check if we're at the end of this word
            const nextCh = this.getCharAt(row, col + 1);
            if (!this.isWordChar(nextCh)) {
                // Already at end of word, move forward to find next word
                col++;
            } else {
                // Move to end of current word
                while (col < this.grid.numCols - 1 && this.isWordChar(this.getCharAt(row, col + 1))) {
                    col++;
                }
                this.grid.setCursor(row, col);
                return;
            }
        } else {
            // Not in a word, start searching from current position
            col++;
        }
        
        // Skip whitespace and find next word
        while (row < this.grid.numRows) {
            while (col < this.grid.numCols) {
                const ch = this.getCharAt(row, col);
                if (this.isWordChar(ch)) {
                    // Found a word, move to its end
                    while (col < this.grid.numCols - 1 && this.isWordChar(this.getCharAt(row, col + 1))) {
                        col++;
                    }
                    this.grid.setCursor(row, col);
                    return;
                }
                // If it's punctuation, it's its own word - stay on it
                if (ch && ch.trim() !== "" && !this.isWordChar(ch)) {
                    this.grid.setCursor(row, col);
                    return;
                }
                col++;
            }
            // Move to next line
            row++;
            col = 0;
            if (row >= this.grid.numRows) break;
        }
    }

    /**
     * Moves forward to the end of the current/next WORD (E).
     */
    private moveWORDEndForward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the end of file, do nothing
        if (row >= this.grid.numRows - 1 && col >= this.grid.numCols - 1) return;
        
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a WORD, check if we're already at the end
        if (this.isNonBlank(currentCh)) {
            // Check if we're at the end of this WORD
            const nextCh = this.getCharAt(row, col + 1);
            if (!this.isNonBlank(nextCh)) {
                // Already at end of WORD, move forward to find next WORD
                col++;
            } else {
                // Move to end of current WORD
                while (col < this.grid.numCols - 1 && this.isNonBlank(this.getCharAt(row, col + 1))) {
                    col++;
                }
                this.grid.setCursor(row, col);
                return;
            }
        } else {
            // Not in a WORD, start searching from current position
            col++;
        }
        
        // Skip whitespace and find next WORD
        while (row < this.grid.numRows) {
            while (col < this.grid.numCols) {
                const ch = this.getCharAt(row, col);
                if (this.isNonBlank(ch)) {
                    // Found a WORD, move to its end
                    while (col < this.grid.numCols - 1 && this.isNonBlank(this.getCharAt(row, col + 1))) {
                        col++;
                    }
                    this.grid.setCursor(row, col);
                    return;
                }
                col++;
            }
            // Move to next line
            row++;
            col = 0;
            if (row >= this.grid.numRows) break;
        }
    }

    /**
     * Moves backward to the start of the current/previous word (b).
     */
    private moveWordBackward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the start of file, do nothing
        if (row === 0 && col === 0) return;
        
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a word, check if we're already at the start
        if (this.isWordChar(currentCh)) {
            // Check if we're at the start of this word
            const prevCh = this.getCharAt(row, col - 1);
            if (!this.isWordChar(prevCh)) {
                // Already at start of word, move backward to find previous word
                if (col > 0) {
                    col--;
                } else {
                    row--;
                    if (row < 0) return;
                    col = this.grid.numCols - 1;
                }
            } else {
                // Move to start of current word
                while (col > 0 && this.isWordChar(this.getCharAt(row, col - 1))) {
                    col--;
                }
                this.grid.setCursor(row, col);
                return;
            }
        } else {
            // Not in a word, move back one position
            if (col > 0) {
                col--;
            } else {
                row--;
                if (row < 0) return;
                col = this.grid.numCols - 1;
            }
        }
        
        // Skip whitespace and punctuation
        while (row >= 0) {
            while (col >= 0) {
                const ch = this.getCharAt(row, col);
                if (this.isWordChar(ch)) {
                    // Found a word, move to its start
                    while (col > 0 && this.isWordChar(this.getCharAt(row, col - 1))) {
                        col--;
                    }
                    this.grid.setCursor(row, col);
                    return;
                }
                // If it's punctuation, it's its own word - stay on it
                if (ch && ch.trim() !== "" && !this.isWordChar(ch)) {
                    this.grid.setCursor(row, col);
                    return;
                }
                if (col === 0) break;
                col--;
            }
            // Move to previous line
            row--;
            if (row < 0) break;
            col = this.grid.numCols - 1;
        }
    }

    /**
     * Moves backward to the start of the current/previous WORD (B).
     */
    private moveWORDBackward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the start of file, do nothing
        if (row === 0 && col === 0) return;
        
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a WORD, check if we're already at the start
        if (this.isNonBlank(currentCh)) {
            // Check if we're at the start of this WORD
            const prevCh = this.getCharAt(row, col - 1);
            if (!this.isNonBlank(prevCh)) {
                // Already at start of WORD, move backward to find previous WORD
                if (col > 0) {
                    col--;
                } else {
                    row--;
                    if (row < 0) return;
                    col = this.grid.numCols - 1;
                }
            } else {
                // Move to start of current WORD
                while (col > 0 && this.isNonBlank(this.getCharAt(row, col - 1))) {
                    col--;
                }
                this.grid.setCursor(row, col);
                return;
            }
        } else {
            // Not in a WORD, move back one position
            if (col > 0) {
                col--;
            } else {
                row--;
                if (row < 0) return;
                col = this.grid.numCols - 1;
            }
        }
        
        // Skip whitespace
        while (row >= 0) {
            while (col >= 0) {
                const ch = this.getCharAt(row, col);
                if (this.isNonBlank(ch)) {
                    // Found a WORD, move to its start
                    while (col > 0 && this.isNonBlank(this.getCharAt(row, col - 1))) {
                        col--;
                    }
                    this.grid.setCursor(row, col);
                    return;
                }
                if (col === 0) break;
                col--;
            }
            // Move to previous line
            row--;
            if (row < 0) break;
            col = this.grid.numCols - 1;
        }
    }

    /**
     * Moves backward to the end of the previous word (ge).
     */
    private moveWordEndBackward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the start of file, do nothing
        if (row === 0 && col === 0) return;
        
        const originalRow = row;
        const originalCol = col;
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a word, move to its start (or before it)
        if (this.isWordChar(currentCh)) {
            // Move to start of current word
            while (col > 0 && this.isWordChar(this.getCharAt(row, col - 1))) {
                col--;
            }
            // Move back one more position to get past the word
            if (col > 0) {
                col--;
            } else {
                row--;
                if (row < 0) return;
                col = this.grid.numCols - 1;
            }
        } else {
            // Not in a word, move back one position
            if (col > 0) {
                col--;
            } else {
                row--;
                if (row < 0) return;
                col = this.grid.numCols - 1;
            }
        }
        
        // Skip whitespace and find previous word
        while (row >= 0) {
            while (col >= 0) {
                const ch = this.getCharAt(row, col);
                if (this.isWordChar(ch)) {
                    // Found a word, move to its end
                    while (col < this.grid.numCols - 1 && this.isWordChar(this.getCharAt(row, col + 1))) {
                        col++;
                    }
                    this.grid.setCursor(row, col);
                    return;
                }
                // If it's punctuation, it's its own word - stay on it
                if (ch && ch.trim() !== "" && !this.isWordChar(ch)) {
                    this.grid.setCursor(row, col);
                    return;
                }
                if (col === 0) break;
                col--;
            }
            // Move to previous line
            row--;
            if (row < 0) break;
            col = this.grid.numCols - 1;
        }
    }

    /**
     * Moves backward to the end of the previous WORD (gE).
     */
    private moveWORDEndBackward(): void {
        const cursor = this.grid.getCursor();
        let row = cursor.row;
        let col = cursor.col;
        
        // If we're at the start of file, do nothing
        if (row === 0 && col === 0) return;
        
        const originalRow = row;
        const originalCol = col;
        const currentCh = this.getCharAt(row, col);
        
        // If we're in a WORD, move to its start (or before it)
        if (this.isNonBlank(currentCh)) {
            // Move to start of current WORD
            while (col > 0 && this.isNonBlank(this.getCharAt(row, col - 1))) {
                col--;
            }
            // Move back one more position to get past the WORD
            if (col > 0) {
                col--;
            } else {
                row--;
                if (row < 0) return;
                col = this.grid.numCols - 1;
            }
        } else {
            // Not in a WORD, move back one position
            if (col > 0) {
                col--;
            } else {
                row--;
                if (row < 0) return;
                col = this.grid.numCols - 1;
            }
        }
        
        // Skip whitespace and find previous WORD
        while (row >= 0) {
            while (col >= 0) {
                const ch = this.getCharAt(row, col);
                if (this.isNonBlank(ch)) {
                    // Found a WORD, move to its end
                    while (col < this.grid.numCols - 1 && this.isNonBlank(this.getCharAt(row, col + 1))) {
                        col++;
                    }
                    this.grid.setCursor(row, col);
                    return;
                }
                if (col === 0) break;
                col--;
            }
            // Move to previous line
            row--;
            if (row < 0) break;
            col = this.grid.numCols - 1;
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
            // Handle Enter - same as ArrowDown in Normal mode
            if (event.key === "Enter") {
                this.moveCursorDown();
                return;
            }
            
            // Handle "$" (shift+4) - go to end of line (special case, doesn't go in buffer)
            if (event.shiftKey && event.key === "4") {
                this.grid.moveCursorBy(0, this.grid.numCols);
                return;
            }
            
            // Ignore modifier keys - they don't go in the buffer
            if (event.key === "Shift" || event.key === "Control" || event.key === "Alt" || event.key === "Meta") {
                return;
            }
            
            // Get the actual character, using the key value which already accounts for Shift
            // event.key already gives us the correct case (e.g., "E" for Shift+E, "e" for just E)
            const key = event.key;
            
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
            
            // 1. Modify buffer (only add the actual character, not modifier keys)
            this.commandBuffer += key;
            
            // 2. Strip (and store) count
            const { count, command } = this.parseRepeatCount(this.commandBuffer);
            
            console.log(`Buffer: "${this.commandBuffer}", Parsed: count=${count}, command="${command}"`);
            console.log(`isRealCommand("${command}"): ${this.isRealCommand(command)}, isPartialCommand("${command}"): ${this.isPartialCommand(command)}`);
            
            // 3. Handle buffer command
            if (this.isRealCommand(command)) {
                // Category 1: Real command -> handle accordingly and flush buffer
                console.log(`Executing command: "${command}" with count: ${count}`);
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

    /**
     * Deletes the character at the current cursor position and shifts characters on the right left.
     */
    private deleteChar(): void {
        const { row, col } = this.grid.getCursor();
        
        // Ensure we're in bounds
        if (!this.grid.inBounds(row, col)) {
            return;
        }
        
        // Check if we're on a tab character
        const cell = this.grid.get(row, col);
        if (this.isTabChar(cell.ch)) {
            // Delete the entire tab
            const tabStart = this.findTabStart(row, col);
            if (tabStart !== null) {
                const rightmost = this.grid.findRightmostOccupied(row);
                if (rightmost >= 0) {
                    // Shift all characters after the tab left by TAB_SIZE
                    for (let c = tabStart; c <= rightmost; c++) {
                        if (c + TAB_SIZE < this.grid.numCols) {
                            const nextCell = this.grid.get(row, c + TAB_SIZE);
                            this.grid.set(row, c, nextCell);
                        } else {
                            this.grid.set(row, c, { ch: '' });
                        }
                    }
                }
            }
            return;
        }
        
        // Normal character deletion - shift characters on the right left
        const rightmost = this.grid.findRightmostOccupied(row);
        if (rightmost >= 0 && col <= rightmost) {
            for (let c = col; c <= rightmost; c++) {
                if (c + 1 < this.grid.numCols) {
                    const nextCell = this.grid.get(row, c + 1);
                    this.grid.set(row, c, nextCell);
                } else {
                    this.grid.set(row, c, { ch: '' });
                }
            }
        }
    }

    /**
     * Replaces the next n characters starting at the current cursor position with the given character.
     * Moves cursor right after each replacement except the last one.
     * If any position would be out of bounds, does not perform any replacements.
     */
    private replaceChars(char: string, count: number): void {
        const { row, col } = this.grid.getCursor();
        
        // Check if all positions are in bounds
        for (let i = 0; i < count; i++) {
            if (!this.grid.inBounds(row, col + i)) {
                // If any position is out of bounds, don't do any replacements
                return;
            }
        }
        
        // Replace each character and move right, except on the last one
        for (let i = 0; i < count; i++) {
            this.grid.set(row, col + i, { ch: char });
            if (i < count - 1) {
                // Move cursor right after each replacement except the last one
                this.grid.moveCursorBy(0, 1);
            }
        }
    }

    /**
     * Replaces the character at the current cursor position with the given character.
     * If the cell is empty, it still sets the character (handles empty lines).
     */
    private replaceChar(char: string): void {
        const { row, col } = this.grid.getCursor();
        
        // Ensure we're in bounds
        if (!this.grid.inBounds(row, col)) {
            return;
        }
        
        // Replace the character at cursor position
        // This works even if the cell is empty (handles empty lines)
        this.grid.set(row, col, { ch: char });
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
