import Konva from "konva";
import { DualGridView } from "./DualGridView.js";
import { ScoreDisplay } from "./ScoreDisplay.js";

/**
 * GameView is a modular component that combines ScoreDisplay and DualGridView.
 * It manages the layout and positioning of both components.
 */
export class GameView {
    private group: Konva.Group;
    private scoreDisplay: ScoreDisplay;
    private dualGridView: DualGridView;
    private readonly SCORE_PANEL_HEIGHT = 80;

    constructor(dualGridView: DualGridView, width: number, height: number) {
        this.dualGridView = dualGridView;
        this.group = new Konva.Group();

        // Create score display at the top
        this.scoreDisplay = new ScoreDisplay(width);

        // Position the dual grid view below the score panel
        this.dualGridView.getGroup().y(this.SCORE_PANEL_HEIGHT);

        // Add both components to the group
        this.group.add(this.scoreDisplay.getGroup());
        this.group.add(this.dualGridView.getGroup());
    }

    getGroup(): Konva.Group {
        return this.group;
    }

    getDualGridView(): DualGridView {
        return this.dualGridView;
    }

    getScoreDisplay(): ScoreDisplay {
        return this.scoreDisplay;
    }

    updateScore(score: number, keyframeIndex: number, totalKeyframes: number): void {
        this.scoreDisplay.updateScore(score, keyframeIndex, totalKeyframes);
    }

    updateTimer(timeRemainingMs: number, totalTimeMs: number): void {
        this.scoreDisplay.updateTimer(timeRemainingMs, totalTimeMs);
    }

    showTimesUp(): void {
        this.scoreDisplay.showTimesUp();
    }

    updateModeLabel(): void {
        this.dualGridView.updateModeLabel();
    }

    resize(width: number, height: number): void {
        const gridHeight = height - this.SCORE_PANEL_HEIGHT;

        // Resize score display
        this.scoreDisplay.resize(width);

        // Update dual grid view position and size
        this.dualGridView.getGroup().y(this.SCORE_PANEL_HEIGHT);
        this.dualGridView.updateLayout(width / 2, gridHeight);

        this.group.getLayer()?.draw();
    }
}
