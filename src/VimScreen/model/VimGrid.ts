
// Represents a single cell in the Vim grid with character and optional highlight
// The highlight is how the character should be displayed (e.g., color, style)
export type Cell = { ch: string; hl?: string };

export default class VimGrid {
    readonly numRows: number;
    readonly numCols: number;
    private grid: Cell[][];

    constructor(numRows: number, numCols: number, Cell: Cell = { ch: ' ' }) {
        this.numRows = numRows;
        this.numCols = numCols;
        this.grid = Array.from({ length: numRows }, () =>
            Array.from({ length: numCols }, () => ({ ...Cell }))
        );
    }

    // Creates a VimGrid from a 2d character array
    static createGridFromText(lines: string[], cols?: number) {
        const width = cols ?? Math.max(1, ...lines.map((l) => l.length));
        const height = Math.max(lines.length, 1);
        const buf = new VimGrid(height, width);
        lines.forEach((line, r) => { for (let c = 0; c < width; c++) buf.set(r, c, { ch: line[c] ?? " " }); });
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


  }
