// Represents a single cell in the Vim grid with character and optional highlight
// The highlight is how the character should be displayed (e.g., color, style)
export type Cell = { ch: string; hl?: string };

export default class VimGrid {
    readonly numRows: number;
    readonly numCols: number;
    private grid: Cell[][];
    private cursor: { row: number; col: number };

    constructor(numRows: number, numCols: number, Cell: Cell = { ch: ' ' }) {
        this.numRows = numRows;
        this.numCols = numCols;
        this.grid = Array.from({ length: numRows }, () =>
            Array.from({ length: numCols }, () => ({ ...Cell }))
        );
        this.cursor = { row: 0, col: 0 };
    }

    // Creates a VimGrid from a 2d character array
    static createGridFromText(lines: string[], cols?: number, initialCursor?: { row: number; col: number }) {
        const width = cols ?? Math.max(1, ...lines.map((l) => l.length));
        const height = Math.max(lines.length, 1);
        const buf = new VimGrid(height, width);
        lines.forEach((line, r) => { for (let c = 0; c < width; c++) buf.set(r, c, { ch: line[c] ?? " " }); });
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
        return { ...this.cursor };
    }

    setCursor(row: number, col: number): void {
        const r = Math.max(0, Math.min(this.numRows - 1, row));
        const c = Math.max(0, Math.min(this.numCols - 1, col));
        this.cursor = { row: r, col: c };
    }

    moveCursorBy(dr: number, dc: number): void {
        const r = Math.max(0, Math.min(this.numRows - 1, this.cursor.row + dr));
        const c = Math.max(0, Math.min(this.numCols - 1, this.cursor.col + dc));
        this.cursor = { row: r, col: c };
    }
  }

