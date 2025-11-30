import VimGrid, { Mode } from "../src/VimGrid.js";

// Mock Konva before importing
jest.mock("konva");

import { GridView } from "../src/GridView.js";
import { DualGridView } from "../src/DualGridView.js";

describe("DualGridView", () => {
    let leftGrid: VimGrid;
    let rightGrid: VimGrid;
    let leftGridView: GridView;
    let rightGridView: GridView;

    beforeEach(() => {
        jest.clearAllMocks();

        leftGrid = VimGrid.createGridFromText(["left", "grid"], 4);
        rightGrid = VimGrid.createGridFromText(["right", "grid"], 5);

        leftGridView = new GridView(leftGrid, 0);
        rightGridView = new GridView(rightGrid, window.innerWidth / 2);
    });

    describe("constructor", () => {
        it("should create a DualGridView with left and right grids", () => {
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);

            expect(dualGridView).toBeDefined();
            expect(dualGridView.getLeftGridView()).toBe(leftGridView);
            expect(dualGridView.getRightGridView()).toBe(rightGridView);
        });

        it("should return a Konva Group", () => {
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);
            const group = dualGridView.getGroup();

            expect(group).toBeDefined();
        });
    });

    describe("getLeftGridView", () => {
        it("should return the left GridView instance", () => {
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);

            expect(dualGridView.getLeftGridView()).toBe(leftGridView);
        });
    });

    describe("getRightGridView", () => {
        it("should return the right GridView instance", () => {
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);

            expect(dualGridView.getRightGridView()).toBe(rightGridView);
        });
    });

    describe("updateModeLabel", () => {
        it("should update mode label without errors", () => {
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);

            expect(() => dualGridView.updateModeLabel()).not.toThrow();
        });

        it("should handle different modes", () => {
            jest.spyOn(leftGrid, "getMode").mockReturnValue(Mode.Insert);
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);

            expect(() => dualGridView.updateModeLabel()).not.toThrow();
        });
    });

    describe("getGroup", () => {
        it("should return the main Konva group", () => {
            const dualGridView = new DualGridView(leftGridView, rightGridView, 800, 600);
            const group = dualGridView.getGroup();

            expect(group).toBeDefined();
        });
    });
});
