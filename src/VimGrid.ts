// Import tab constants for conversion
import { TAB_LEFT, TAB_MIDDLE, TAB_RIGHT, TAB_SIZE } from "./VimController.js";

// Represents a single cell in the Vim grid with character and optional highlight
// The highlight is how the character should be displayed (e.g., color, style)
export type Cell = { ch: string; hl?: string };

export enum Mode {
    Normal = "normal",
    Insert = "insert",
}

export default class VimGrid {
    numRows: number;
    numCols: number;
    private grid: Cell[][];
    private cursor: { row: number; col: number };
    private virtualCol: number = 0; // Effective column that persists across line changes
    private mode: Mode = Mode.Normal;

    constructor(numRows: number, numCols: number, Cell: Cell = { ch: '' }) {
        this.numRows = numRows;
        this.numCols = numCols;
        this.grid = Array.from({ length: numRows }, () =>
            Array.from({ length: numCols }, () => ({ ...Cell }))
        );
        this.cursor = { row: 0, col: 0 };
        this.virtualCol = 0;
    }

    // Creates a VimGrid from a 2d character array
    static createGridFromText(lines: string[], cols?: number, initialCursor?: { row: number; col: number }) {
        // First pass: convert tabs to special tab characters and calculate actual width needed
        const processedLines: string[][] = [];
        let maxWidth = 0;
        
        lines.forEach((line) => {
            const processedLine: string[] = [];
            let col = 0;
            
            for (let i = 0; i < line.length; i++) {
                if (line[i] === '\t') {
                    // Calculate next tab stop
                    const nextTabStop = Math.ceil((col + 1) / TAB_SIZE) * TAB_SIZE;
                    const distance = nextTabStop - col;
                    
                    if (distance === 1) {
                        processedLine.push(TAB_LEFT);
                        processedLine.push(TAB_RIGHT);
                        col = nextTabStop + 1;
                    } else {
                        // Insert tab characters: TAB_LEFT, TAB_MIDDLE (if needed), TAB_RIGHT
                        processedLine.push(TAB_LEFT);
                        for (let j = 1; j < distance - 1; j++) {
                            processedLine.push(TAB_MIDDLE);
                        }
                        processedLine.push(TAB_RIGHT);
                        col = nextTabStop;
                    }
                } else {
                    processedLine.push(line[i]);
                    col++;
                }
            }
            
            processedLines.push(processedLine);
            maxWidth = Math.max(maxWidth, processedLine.length);
        });
        
        const width = cols ?? Math.max(1, maxWidth);
        const height = Math.max(processedLines.length, 1);
        const buf = new VimGrid(height, width);
        
        // Initialize grid
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                buf.grid[r][c] = { ch: '' };
            }
        }
        
        // Fill grid with processed lines
        processedLines.forEach((line, r) => { 
            for (let c = 0; c < line.length && c < width; c++) {
                buf.set(r, c, { ch: line[c] });
            }
        });
        
        if (initialCursor) {
            buf.setCursor(initialCursor.row, initialCursor.col);
        }
        return buf;
    }

    // Helper Functions
    inBounds(r: number, c: number) { 
        return r >= 0 && r < this.numRows && c >= 0 && c < this.numCols;
    }

    // Read a Cell at row r, col c
    get(r: number, c: number) { 
        if (!this.inBounds(r, c)) {
            throw new Error(`OOB(${r},${c})`);
        }  
        return this.grid[r][c];
    }
    
    // Write a Cell at row r, col c
    set(r: number, c: number, cell: Cell) {
        if (!this.inBounds(r, c)) {
            return;
        }  
        this.grid[r][c] = { ...cell, ch: (cell.ch ?? " ").slice(0, 1) }; 
    }

    getGrid(): ReadonlyArray<ReadonlyArray<Cell>> {
        return this.grid;
    }

    // Cursor methods
    getCursor(): { row: number; col: number } {
        // Return the effective column (virtual column if valid, otherwise rightmost valid)
        const rightmost = this.findRightmostOccupied(this.cursor.row);
        let effectiveCol = this.virtualCol;
        
        if (rightmost < 0) {
            // Empty line - use column 0
            effectiveCol = 0;
        } else {
            // Check if virtual column is valid on this line
            const maxCol = this.mode === Mode.Insert ? Math.min(rightmost + 1, this.numCols - 1) : rightmost;
            if (this.virtualCol > maxCol) {
                // Virtual column is beyond line - use rightmost valid
                effectiveCol = maxCol;
            } else {
                // Virtual column is valid - use it
                effectiveCol = this.virtualCol;
            }
        }
        
        return { row: this.cursor.row, col: effectiveCol };
    }

    getVirtualColumn(): number {
        return this.virtualCol;
    }

    setCursor(row: number, col: number, updateVirtual: boolean = true): void {
        const r = Math.max(0, Math.min(this.numRows - 1, row));
        const maxCol = this.mode === Mode.Insert ? this.numCols : this.numCols - 1;
        const c = Math.max(0, Math.min(maxCol, col));
        this.cursor = { row: r, col: c };
        
        // Update virtual column if explicitly setting cursor
        if (updateVirtual) {
            this.virtualCol = c;
        }
    }

    moveCursorBy(dr: number, dc: number): void {
        const r = Math.max(0, Math.min(this.numRows - 1, this.cursor.row + dr));
        const c = Math.max(0, Math.min(this.numCols - 1, this.cursor.col + dc));
        this.cursor = { row: r, col: c };
        
        // Update virtual column when moving left/right
        if (dc !== 0) {
            this.virtualCol = c;
        }
    }

    // Check if a cell is empty
    isEmpty(r: number, c: number): boolean {
        if (!this.inBounds(r, c)) return true;
        const cell = this.get(r, c);
        return cell.ch === '';
    }

    // Find the rightmost filled cell in a row (including whitespace)
    // Returns -1 if the row is completely empty
    findRightmostOccupied(row: number): number {
        if (!this.inBounds(row, 0)) return -1;
        
        for (let c = this.numCols - 1; c >= 0; c--) {
            if (!this.isEmpty(row, c)) {
                return c;
            }
        }
        return -1;
    }

    // Set Vim mode
    setMode(mode: Mode): void {
        this.mode = mode;
    }

    // Returns Vim mode
    getMode(): Mode {
        return this.mode;
    }

    // Add a new row at the specified index
    addRow(atIndex?: number): void {
        const index = atIndex ?? this.numRows;
        const newRow = Array.from({ length: this.numCols }, () => ({ ch: '' }));
        this.grid.splice(index, 0, newRow);
        this.numRows++;
    }

    // Check if a row is completely empty
    isRowEmpty(row: number): boolean {
        if (!this.inBounds(row, 0)) return true;
        return this.findRightmostOccupied(row) < 0;
    }

    // Append one row to the grid
    appendRow(): void {
        const newRow = Array.from({ length: this.numCols }, () => ({ ch: '' }));
        this.grid.push(newRow);
        this.numRows++;
    }

    // Append one column to the grid
    appendColumn(): void {
        for (let r = 0; r < this.grid.length; r++) {
            this.grid[r].push({ ch: '' });
        }
        this.numCols++;
    }

    // Remove a row at the specified index
    removeRow(atIndex: number): void {
        if (atIndex < 0 || atIndex >= this.numRows) return;
        if (this.numRows <= 1) return;
        
        this.grid.splice(atIndex, 1);
        this.numRows--;
        if (this.cursor.row >= this.numRows) {
            this.cursor.row = Math.max(0, this.numRows - 1);
        }
    }
  }

