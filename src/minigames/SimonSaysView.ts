// View: Handles all visual rendering using Konva

import Konva from "konva";
import { Command } from "./SimonSaysModel.js";

export class SimonSaysView {
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;
  private progressText: Konva.Text | null = null;

  initialize(): void {
    // Show game container
    document.body.classList.add("game-active");
    const gameRoot = document.getElementById("game-root");
    if (!gameRoot) return;
    gameRoot.classList.add("active");

    // Initialize Konva stage
    this.stage = new Konva.Stage({
      container: "game-root",
      width: window.innerWidth,
      height: window.innerHeight,
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  }

  showRoundScreen(roundNumber: number): void {
    if (!this.layer) return;

    this.layer.destroyChildren();

    const titleText = new Konva.Text({
      x: 0,
      y: 50,
      width: window.innerWidth,
      text: `Round ${roundNumber}`,
      fontSize: 48,
      fontFamily: "monospace",
      fill: "#00ff00",
      align: "center",
    });

    const instructionText = new Konva.Text({
      x: 0,
      y: 120,
      width: window.innerWidth,
      text: "Watch the sequence...",
      fontSize: 24,
      fontFamily: "monospace",
      fill: "#ffffff",
      align: "center",
    });

    this.layer.add(titleText);
    this.layer.add(instructionText);
    this.layer.draw();
  }

  showInputPrompt(sequenceLength: number, playerInputLength: number): void {
    if (!this.layer) return;

    this.layer.destroyChildren();

    const titleText = new Konva.Text({
      x: 0,
      y: 50,
      width: window.innerWidth,
      text: `Your Turn!`,
      fontSize: 48,
      fontFamily: "monospace",
      fill: "#00ff00",
      align: "center",
    });

    const instructionText = new Konva.Text({
      x: 0,
      y: 120,
      width: window.innerWidth,
      text: `Repeat the sequence (${sequenceLength} commands)`,
      fontSize: 24,
      fontFamily: "monospace",
      fill: "#ffffff",
      align: "center",
    });

    this.progressText = new Konva.Text({
      x: 0,
      y: 180,
      width: window.innerWidth,
      text: `Progress: ${playerInputLength}/${sequenceLength}`,
      fontSize: 20,
      fontFamily: "monospace",
      fill: "#888888",
      align: "center",
    });

    this.layer.add(titleText);
    this.layer.add(instructionText);
    this.layer.add(this.progressText);
    this.layer.draw();
  }

  updateProgress(sequenceLength: number, playerInputLength: number): void {
    if (!this.progressText) return;
    this.progressText.text(`Progress: ${playerInputLength}/${sequenceLength}`);
    this.layer?.draw();
  }

  async flashCommand(command: Command, isPlayerInput: boolean): Promise<void> {
    if (!this.layer) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const commandBox = new Konva.Rect({
      x: centerX - 100,
      y: centerY - 100,
      width: 200,
      height: 200,
      fill: isPlayerInput ? "#0066ff" : "#00ff00",
      cornerRadius: 10,
      opacity: 0,
    });

    const commandText = new Konva.Text({
      x: centerX - 100,
      y: centerY - 50,
      width: 200,
      text: command.displayName,
      fontSize: 72,
      fontFamily: "monospace",
      fill: "#000000",
      align: "center",
      verticalAlign: "middle",
      opacity: 0,
    });

    this.layer.add(commandBox);
    this.layer.add(commandText);

    // Fade in
    commandBox.to({ opacity: 1, duration: 0.1 });
    commandText.to({ opacity: 1, duration: 0.1 });

    await this.sleep(400);

    // Fade out
    commandBox.to({ opacity: 0, duration: 0.1 });
    commandText.to({ opacity: 0, duration: 0.1 });

    await this.sleep(100);

    commandBox.destroy();
    commandText.destroy();
    this.layer.draw();
  }

  showGameOver(roundNumber: number, sequenceLength: number): void {
    if (!this.layer) return;

    this.layer.destroyChildren();

    const gameOverText = new Konva.Text({
      x: 0,
      y: window.innerHeight / 2 - 100,
      width: window.innerWidth,
      text: "Game Over!",
      fontSize: 64,
      fontFamily: "monospace",
      fill: "#ff0000",
      align: "center",
    });

    const roundText = new Konva.Text({
      x: 0,
      y: window.innerHeight / 2,
      width: window.innerWidth,
      text: `You reached Round ${roundNumber}`,
      fontSize: 32,
      fontFamily: "monospace",
      fill: "#ffffff",
      align: "center",
    });

    const sequenceLengthText = new Konva.Text({
      x: 0,
      y: window.innerHeight / 2 + 60,
      width: window.innerWidth,
      text: `Sequence Length: ${sequenceLength}`,
      fontSize: 28,
      fontFamily: "monospace",
      fill: "#888888",
      align: "center",
    });

    const exitText = new Konva.Text({
      x: 0,
      y: window.innerHeight / 2 + 140,
      width: window.innerWidth,
      text: "Press ESC to exit",
      fontSize: 20,
      fontFamily: "monospace",
      fill: "#666666",
      align: "center",
    });

    this.layer.add(gameOverText);
    this.layer.add(roundText);
    this.layer.add(sequenceLengthText);
    this.layer.add(exitText);
    this.layer.draw();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy(): void {
    // Hide game view
    document.body.classList.remove("game-active");
    const gameRoot = document.getElementById("game-root");
    if (gameRoot) {
      gameRoot.classList.remove("active");
    }

    // Destroy stage
    if (this.stage) {
      this.stage.destroy();
      this.stage = null;
    }

    this.layer = null;
  }
}
