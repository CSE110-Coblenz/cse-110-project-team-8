import VimGrid, { Mode } from "../src/VimGrid.js";
// Mock Konva before importing GridView
jest.mock("konva");

import { GridView } from "../src/GridView.js";

describe("GridView", () => {
    let mockGrid: VimGrid;

    beforeEach(() => {
        jest.clearAllMocks();
        mockGrid = VimGrid.createGridFromText(["abc", "def", "ghi"], 3);
    });

    it("should create a GridView with default cell dimensions", () => {
        const gridView = new GridView(mockGrid, 0);

        expect(gridView).toBeDefined();
        expect(gridView.getVimGrid()).toBe(mockGrid);
    });

    it("should return a Konva Group", () => {
        const gridView = new GridView(mockGrid, 0);
        const group = gridView.getGroup();

        expect(group).toBeDefined();
    });

    it("should update grid reference", () => {
        const gridView = new GridView(mockGrid, 0);
        const newGrid = VimGrid.createGridFromText(["xyz"], 3);

        gridView.update(newGrid);

        expect(gridView.getVimGrid()).toBe(newGrid);
    });

    it("should handle grid expansion and shrinking", () => {
        const gridView = new GridView(mockGrid, 0);
        const expandedGrid = VimGrid.createGridFromText(["abc", "def", "ghi", "jkl", "mno"], 3);
        const shrunkGrid = VimGrid.createGridFromText(["a"], 1);

        expect(() => gridView.update(expandedGrid)).not.toThrow();
        expect(() => gridView.update(shrunkGrid)).not.toThrow();
    });

    it("should handle cells with highlights", () => {
        const gridView = new GridView(mockGrid, 0);
        const newGrid = VimGrid.createGridFromText(["abc"], 3);
        const gridData = newGrid.getGrid();
        gridData[0][0].hl = "Visual";

        expect(() => gridView.update(newGrid)).not.toThrow();
    });

    it("should set cursor position without errors", () => {
        const gridView = new GridView(mockGrid, 0, 12, 20);

        expect(() => gridView.setCursor(1, 2)).not.toThrow();
        expect(() => gridView.setCursor(0, 0)).not.toThrow();
    });

    it("should clamp cursor to valid bounds", () => {
        const gridView = new GridView(mockGrid, 0);

        expect(() => gridView.setCursor(-1, -1)).not.toThrow();
        expect(() => gridView.setCursor(100, 100)).not.toThrow();
    });

    it("should handle different modes for cursor positioning", () => {
        const gridView = new GridView(mockGrid, 0, 12, 20);

        jest.spyOn(mockGrid, "getMode").mockReturnValue(Mode.Normal);
        expect(() => gridView.setCursor(0, 2)).not.toThrow();

        jest.spyOn(mockGrid, "getMode").mockReturnValue(Mode.Insert);
        expect(() => gridView.setCursor(0, 3)).not.toThrow();
    });

    it("should control cursor visibility", () => {
        const gridView = new GridView(mockGrid, 0);

        expect(() => gridView.setCursorVisible(true)).not.toThrow();
        expect(() => gridView.setCursorVisible(false)).not.toThrow();
    });

    it("should return the VimGrid instance", () => {
        const gridView = new GridView(mockGrid, 0);

        expect(gridView.getVimGrid()).toBe(mockGrid);
    });
});
