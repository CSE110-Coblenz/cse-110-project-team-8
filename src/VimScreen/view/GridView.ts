import Konva from "konva";
import VimGrid from "../model/VimGrid";

export class GridView {
    private group: Konva.Group;
    private cells: Konva.Text[][] = [];
    private highlights: Konva.Rect[][] = [];
    private grid: VimGrid;

    private readonly cellW: number;
    private readonly cellH: number;
    private readonly fontSize: number;
    private readonly fontFamily: string;
    private cursor: Konva.Rect;
    private blinkInterval?: number;

    private readonly HL_COLORS: Record<string, { fill?: string; text?: string }> = {
    StatusLine: { fill: "#1f2937", text: "#e5e7eb" },
    Visual: { fill: "#1d4ed8", text: "#ffffff" },
    };

    constructor(grid: VimGrid, cellW = 12, cellH = 20, fontSize = 16) {
        this.group = new Konva.Group();
        this.grid = grid;
        this.cellW = cellW;
        this.cellH = cellH;
        this.fontSize = fontSize;
        this.fontFamily =
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace';

        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            fill: "black", 
        });
        this.group.add(background);

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

        for (let r = 0; r < grid.numRows; r++) {
            for (let c = 0; c < grid.numCols; c++) {
                const cell = rows[r][c];
                const rect = this.highlights[r][c];
                const text = this.cells[r][c];
                const hl = cell.hl ? this.HL_COLORS[cell.hl] : undefined; // type: {fill?:string; text?:string} | undefined
                rect.setAttrs({ fill: hl?.fill || "#000000ff" });
                text.setAttrs({
                    text: cell.ch || " ",
                    fill: hl?.text || "#e5e5e5",
                });
            }
        }
        this.group.getLayer()?.batchDraw();
    }

    /** Move cursor to given row/col (purely visual) */
    setCursor(row: number, col: number) {
        this.cursor.position({ x: col * this.cellW, y: row * this.cellH });
        this.group.getLayer()?.batchDraw();
    }

    /** Show/hide cursor (controller uses this for blinking) */
    setCursorVisible(visible: boolean) {
        this.cursor.visible(visible);
        this.group.getLayer()?.batchDraw();
    }

    getGroup(): Konva.Group {
        return this.group;
    }
}
