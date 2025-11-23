import Konva from "konva";
import { GridView } from "./GridView.js";

export class DualGridView {
  private group: Konva.Group;
  private leftGridView: GridView;
  private rightGridView: GridView;
  private modeLabel: Konva.Text;
  private leftGroup: Konva.Group;
  private rightGroup: Konva.Group;

  constructor(leftGrid: GridView, rightGrid: GridView) {
    this.leftGridView = leftGrid;
    this.rightGridView = rightGrid;

    this.group = new Konva.Group();

    this.leftGroup = new Konva.Group({
        x: 0,
        y: 0,
        width: window.innerWidth /2 ,
        height: window.innerHeight
    });

    this.rightGroup = new Konva.Group({
        x: window.innerWidth /2,
        y: 0,
        width: window.innerWidth /2 ,
        height: window.innerHeight
    });

    this.modeLabel = new Konva.Text({
        text: 'Current Mode: ' + this.leftGridView.getVimGrid().getMode(),
        fontSize: 20,
        fill: 'blue',
        x: window.innerWidth / 200, // Position relative to the group's origin
        y: window.innerHeight * 97/100
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

  resize(width: number, height: number): void {
    const halfWidth = width / 2;

    // Update left group
    this.leftGroup.width(halfWidth);
    this.leftGroup.height(height);

    // Update right group position and size
    this.rightGroup.x(halfWidth);
    this.rightGroup.width(halfWidth);
    this.rightGroup.height(height);

    // Update mode label position
    this.modeLabel.x(width / 200);
    this.modeLabel.y(height * 97/100);

    // Update the individual grid views
    this.leftGridView.resize(halfWidth, height);
    this.rightGridView.resize(halfWidth, height);

    this.group.getLayer()?.draw();
  }
}
