import Konva from "konva";
import { GridView } from "./GridView.js";

export class DualGridView {
  private group: Konva.Group;
  private leftGridView: GridView;
  private rightGridView: GridView;
  private modeLabel: Konva.Text;
  private viewWidth: number;
  private viewHeight: number;
  private leftGroup: Konva.Group;
  private rightGroup: Konva.Group;

  constructor(leftGrid: GridView, rightGrid: GridView, viewWidth: number, viewHeight: number) {
    this.leftGridView = leftGrid;
    this.rightGridView = rightGrid;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;

    this.group = new Konva.Group();

    this.leftGroup = new Konva.Group({
        x: 0,
        y: 0,
    });
    this.clipGroup(this.leftGroup, this.viewWidth, this.viewHeight);
    
    this.rightGroup = new Konva.Group({
        x: this.viewWidth,
        y: 0,
    });
    this.clipGroup(this.rightGroup, this.viewWidth, this.viewHeight);

    this.modeLabel = new Konva.Text({
        text: 'Current Mode: ' + this.leftGridView.getVimGrid().getMode(),
        fontSize: 20,
        fill: 'blue',
        x: 16,
        y: this.viewHeight - 40
    });

    // Add the inner grid groups directly to this group
    this.leftGroup.add(this.leftGridView.getGroup());
    this.rightGroup.add(this.rightGridView.getGroup());

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

  updateLayout(viewWidth: number, viewHeight: number) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.clipGroup(this.leftGroup, this.viewWidth, this.viewHeight);
    if (typeof this.rightGroup.position === "function") {
      this.rightGroup.position({ x: this.viewWidth, y: 0 });
    }
    this.clipGroup(this.rightGroup, this.viewWidth, this.viewHeight);
    this.leftGridView.setViewport(viewWidth, viewHeight);
    this.rightGridView.setViewport(viewWidth, viewHeight);
    this.modeLabel.position({ x: 16, y: this.viewHeight - 40 });
    this.group.getLayer()?.batchDraw();
  }

  private clipGroup(group: Konva.Group, width: number, height: number) {
    const clip = (group as unknown as { clip?: (config: { x: number; y: number; width: number; height: number }) => void }).clip;
    if (typeof clip === "function") {
      clip.call(group, { x: 0, y: 0, width, height });
    }
  }
}
