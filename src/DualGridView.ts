import Konva from "konva";
import { GridView } from "./GridView.js";

export class DualGridView {
  private group: Konva.Group;
  private leftGridView: GridView;
  private rightGridView: GridView;
  private modeLabel: Konva.Text;

  constructor(leftGrid: GridView, rightGrid: GridView) {
    this.leftGridView = leftGrid;
    this.rightGridView = rightGrid;

    this.group = new Konva.Group();

    const leftGroup = new Konva.Group({
        x: 0,
        y: 0,
        width: window.innerWidth /2 ,
        height: window.innerHeight
    });
    
    const rightGroup = new Konva.Group({
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
    leftGroup.add(this.leftGridView.getGroup());
    rightGroup.add(this.rightGridView.getGroup());

    this.group.add(leftGroup);
    this.group.add(rightGroup);
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
}
