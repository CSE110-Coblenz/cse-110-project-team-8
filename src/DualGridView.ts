import Konva from "konva";
import { GridView } from "./GridView.js";
import { ScoreDisplay } from "./ScoreDisplay.js";

export class DualGridView {
  private group: Konva.Group;
  private leftGridView: GridView;
  private rightGridView: GridView;
  private modeLabel: Konva.Text;
  private leftGroup: Konva.Group;
  private rightGroup: Konva.Group;
  private scoreDisplay: ScoreDisplay;
  private readonly SCORE_PANEL_HEIGHT = 80;

  constructor(leftGrid: GridView, rightGrid: GridView) {
    this.leftGridView = leftGrid;
    this.rightGridView = rightGrid;

    this.group = new Konva.Group();

    // Create score display at the top
    this.scoreDisplay = new ScoreDisplay(window.innerWidth);

    // Position grids below the score panel
    this.leftGroup = new Konva.Group({
        x: 0,
        y: this.SCORE_PANEL_HEIGHT,
        width: window.innerWidth / 2,
        height: window.innerHeight - this.SCORE_PANEL_HEIGHT
    });

    this.rightGroup = new Konva.Group({
        x: window.innerWidth / 2,
        y: this.SCORE_PANEL_HEIGHT,
        width: window.innerWidth / 2,
        height: window.innerHeight - this.SCORE_PANEL_HEIGHT
    });

    this.modeLabel = new Konva.Text({
        text: 'Current Mode: ' + this.leftGridView.getVimGrid().getMode(),
        fontSize: 20,
        fill: 'blue',
        x: window.innerWidth / 200,
        y: window.innerHeight * 97/100
    });

    // Add the inner grid groups directly to this group
    this.leftGroup.add(this.leftGridView.getGroup());
    this.rightGroup.add(this.rightGridView.getGroup());

    this.group.add(this.scoreDisplay.getGroup());
    this.group.add(this.leftGroup);
    this.group.add(this.rightGroup);
    this.group.add(this.modeLabel);

  }

  getGroup(): Konva.Group {
    return this.group;
  }

  getLeftGridView(): GridView {
    return this.leftGridView;
  }

  getRightGridView(): GridView {
    return this.rightGridView;
  }

  private buildModeLabel() {
    return 'Current Mode: ' + this.leftGridView.getVimGrid().getMode();
  }

  updateModeLabel() {
    this.modeLabel.text(this.buildModeLabel());
    this.modeLabel.getLayer()?.draw();
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

  getScoreDisplay(): ScoreDisplay {
    return this.scoreDisplay;
  }

  resize(width: number, height: number): void {
    const halfWidth = width / 2;
    const gridHeight = height - this.SCORE_PANEL_HEIGHT;

    // Resize score display
    this.scoreDisplay.resize(width);

    // Update left group
    this.leftGroup.width(halfWidth);
    this.leftGroup.height(gridHeight);
    this.leftGroup.y(this.SCORE_PANEL_HEIGHT);

    // Update right group position and size
    this.rightGroup.x(halfWidth);
    this.rightGroup.width(halfWidth);
    this.rightGroup.height(gridHeight);
    this.rightGroup.y(this.SCORE_PANEL_HEIGHT);

    // Update mode label position
    this.modeLabel.x(width / 200);
    this.modeLabel.y(height * 97/100);

    // Update the individual grid views with reduced height
    this.leftGridView.resize(halfWidth, gridHeight);
    this.rightGridView.resize(halfWidth, gridHeight);

    this.group.getLayer()?.draw();
  }
}
