import Konva from "konva";
import VimGrid, { Mode } from "./VimGrid.js";
import { TAB_LEFT, TAB_MIDDLE, TAB_RIGHT } from "./VimController.js";

export class GridView {
    private group: Konva.Group;
    private cells: Konva.Text[][] = [];
    private highlights: Konva.Rect[][] = [];
    private grid: VimGrid;
    private background: Konva.Rect;
    private viewportWidth: number;
    private viewportHeight: number;

    private readonly cellW: number;
    private readonly cellH: number;
    private readonly fontSize: number;
    private readonly fontFamily: string;
    private cursor: Konva.Rect;
    private blinkInterval?: number;

    private readonly HL_COLORS: Record<string, { fill?: string; text?: string }> = {
    StatusLine: { fill: "#1f2937", text: "#e5e7eb" },
    Visual: { fill: "#1d4ed8", text: "#ffffff" },
    Mismatch: { fill: "#000000ff", text: "#ff0000" }, // Red text for mismatched cells
    LevelSelect: { fill: "#3b82f6", text: "#ffffff" }, // Light blue for level select highlighting
    Perfect: { fill: "#10b981", text: "#ffffff" }, // Green for perfect match feedback
    };

    constructor(grid: VimGrid, viewWidth = window.innerWidth / 2, viewHeight = window.innerHeight, cellW = 12, cellH = 20, fontSize = 16) {
        this.group = new Konva.Group();
        this.grid = grid;
        this.cellW = cellW;
        this.cellH = cellH;
        this.fontSize = fontSize;
        this.fontFamily =
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace';
        this.viewportWidth = viewWidth;
        this.viewportHeight = viewHeight;

        this.background = new Konva.Rect({
            x: 0,
            y: 0,
            width: viewWidth,
            height: viewHeight,
            fill: "black", 
        });
        this.group.add(this.background);

        // build static grid of rects + text
        const rows = grid.getGrid();
        for (let r = 0; r < grid.numRows; r++) {
            const rowRects: Konva.Rect[] = [];
            const rowText: Konva.Text[] = [];
            for (let c = 0; c < grid.numCols; c++) {
                const rect = new Konva.Rect({
                    x: c * this.cellW,
                    y: r * this.cellH,
                    width: this.cellW,
                    height: this.cellH,
                    fill: "#000000ff",
                });
                const text = new Konva.Text({
                    x: c * this.cellW,
                    y: r * this.cellH + (this.cellH - this.fontSize) / 2,
                    width: this.cellW,
                    height: this.cellH,
                    text: rows[r][c].ch || " ",
                    fontSize: this.fontSize,
                    fontFamily: this.fontFamily,
                    fill: "#e5e5e5",
                });

                this.group.add(rect);
                this.group.add(text);
                rowRects.push(rect);
                rowText.push(text);
            }
            this.highlights.push(rowRects);
            this.cells.push(rowText);
        }
        this.cursor = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.cellW,
            height: this.cellH,
            stroke: "#22d3ee", // cyan border
            strokeWidth: 2,
            cornerRadius: 2,
            listening: false,
        });
        this.group.add(this.cursor);

        let visible = true;
        this.blinkInterval = window.setInterval(() => {
            visible = !visible;
            this.cursor.visible(visible);
            this.group.getLayer()?.batchDraw();
        }, 500);
    }

    /** update entire grid when model changes */
    update(grid: VimGrid): void {
        this.grid = grid;
        const rows = grid.getGrid();

        // Remove excess rows if grid shrunk
        while (this.cells.length > grid.numRows) {
            const r = this.cells.length - 1;
            // Remove cells from Konva group
            for (let c = 0; c < this.cells[r].length; c++) {
                this.highlights[r][c].destroy();
                this.cells[r][c].destroy();
            }
            this.highlights.pop();
            this.cells.pop();
        }

        // Expand rows if needed
        while (this.cells.length < grid.numRows) {
            const r = this.cells.length;
            const rowRects: Konva.Rect[] = [];
            const rowText: Konva.Text[] = [];
            for (let c = 0; c < grid.numCols; c++) {
                const rect = new Konva.Rect({
                    x: c * this.cellW,
                    y: r * this.cellH,
                    width: this.cellW,
                    height: this.cellH,
                    fill: "#000000ff",
                });
                const text = new Konva.Text({
                    x: c * this.cellW,
                    y: r * this.cellH + (this.cellH - this.fontSize) / 2,
                    width: this.cellW,
                    height: this.cellH,
                    text: " ",
                    fontSize: this.fontSize,
                    fontFamily: this.fontFamily,
                    fill: "#e5e5e5",
                });
                this.group.add(rect);
                this.group.add(text);
                rowRects.push(rect);
                rowText.push(text);
            }
            this.highlights.push(rowRects);
            this.cells.push(rowText);
        }

        // Remove excess columns if grid shrunk, then expand if needed
        for (let r = 0; r < Math.min(this.cells.length, grid.numRows); r++) {
            // Remove excess columns
            while (this.cells[r].length > grid.numCols) {
                const c = this.cells[r].length - 1;
                this.highlights[r][c].destroy();
                this.cells[r][c].destroy();
                this.highlights[r].pop();
                this.cells[r].pop();
            }
            
            // Expand columns if needed
            while (this.cells[r].length < grid.numCols) {
                const c = this.cells[r].length;
                const rect = new Konva.Rect({
                    x: c * this.cellW,
                    y: r * this.cellH,
                    width: this.cellW,
                    height: this.cellH,
                    fill: "#000000ff",
                });
                const text = new Konva.Text({
                    x: c * this.cellW,
                    y: r * this.cellH + (this.cellH - this.fontSize) / 2,
                    width: this.cellW,
                    height: this.cellH,
                    text: " ",
                    fontSize: this.fontSize,
                    fontFamily: this.fontFamily,
                    fill: "#e5e5e5",
                });
                this.group.add(rect);
                this.group.add(text);
                this.highlights[r].push(rect);
                this.cells[r].push(text);
            }
        }

        // Update all cells
        for (let r = 0; r < grid.numRows; r++) {
            for (let c = 0; c < grid.numCols; c++) {
                const cell = rows[r][c];
                const rect = this.highlights[r][c];
                const text = this.cells[r][c];
                const hl = cell.hl ? this.HL_COLORS[cell.hl] : undefined; 
                rect.setAttrs({ fill: hl?.fill || "#000000ff" });
                // Display tab characters as spaces
                const displayChar = (cell.ch === TAB_LEFT || cell.ch === TAB_MIDDLE || cell.ch === TAB_RIGHT) ? " " : (cell.ch || " ");
                text.setAttrs({
                    text: displayChar,
                    fill: hl?.text || "#e5e5e5",
                });
            }
        }
        this.group.getLayer()?.batchDraw();
    }

    setCursor(row: number, col: number) {
        // No validation needed - values come from VimGrid.getCursor() which are already validated
        this.cursor.position({ x: col * this.cellW, y: row * this.cellH });
        this.cursor.visible(true);
        this.group.getLayer()?.batchDraw();
        this.cursor.moveToTop();
    }

    setCursorVisible(visible: boolean) {
        this.cursor.visible(visible);
        this.group.getLayer()?.batchDraw();
    }

    getGroup(): Konva.Group {
        return this.group;
    }

    getVimGrid(): VimGrid {
        return this.grid;
    }

    setViewport(width: number, height: number) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        this.background.width(width);
        this.background.height(height);
        this.group.getLayer()?.batchDraw();
    }
}
