// Main entry point for Simon Says game - orchestrates MVC components

import { SimonSaysModel } from "./simonSaysModel.js";
import { SimonSaysView } from "./simonSaysView.js";
import { SimonSaysController } from "./simonSaysController.js";

export class SimonSays {
  private controller: SimonSaysController;

  constructor() {
    const model = new SimonSaysModel();
    const view = new SimonSaysView();
    this.controller = new SimonSaysController(model, view);
  }

  setOnExit(callback: () => void): void {
    this.controller.setOnExit(callback);
  }

  start(): void {
    this.controller.start();
  }

  stop(): void {
    this.controller.stop();
  }
}
