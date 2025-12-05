// Controller: Handles user input and coordinates Model and View

import { SimonSaysModel } from "./SimonSaysModel.js";
import { SimonSaysView } from "./SimonSaysView.js";
import { saveMinigameScore } from "../progressStore.js";

export class SimonSaysController {
  private model: SimonSaysModel;
  private view: SimonSaysView;
  private onExit?: () => void;

  constructor(model: SimonSaysModel, view: SimonSaysView) {
    this.model = model;
    this.view = view;
  }

  setOnExit(callback: () => void): void {
    this.onExit = callback;
  }

  start(): void {
    this.view.initialize();
    window.addEventListener("keydown", this.handleKeyPress);
    this.startNewRound();
  }

  private handleKeyPress = (event: KeyboardEvent) => {
    // Allow ESC to exit during game over
    if (event.key === "Escape" && this.model.getState() === "gameover") {
      this.stop();
      if (this.onExit) {
        this.onExit();
      }
      return;
    }

    // Only accept input during input phase
    if (this.model.getState() !== "input") return;

    event.preventDefault();

    // Check if the key is a valid command
    const command = this.model.isValidCommand(event.key);
    if (!command) {
      // Invalid key pressed - game over
      this.gameOver();
      return;
    }

    // Add to player input in model
    this.model.addPlayerInput(command);

    // Check if input is correct
    if (!this.model.isInputCorrect()) {
      // Wrong input - game over
      this.gameOver();
      return;
    }

    // Flash the input visually
    this.view.flashCommand(command, true);

    // Update progress display
    this.view.updateProgress(
      this.model.getSequenceLength(),
      this.model.getPlayerInputLength()
    );

    // Check if sequence is complete
    if (this.model.isSequenceComplete()) {
      // Correct! Increment round and move to next
      this.model.incrementRound();
      this.model.setState("showing"); // Prevent additional input during transition
      setTimeout(() => {
        this.startNewRound();
      }, 500);
    }
  };

  private startNewRound(): void {
    // Add a new random command to the sequence
    this.model.addRandomCommandToSequence();
    this.model.clearPlayerInput();
    this.model.setState("showing");

    // Show the sequence
    this.showSequence();
  }

  private async showSequence(): Promise<void> {
    // Show round screen
    this.view.showRoundScreen(this.model.getCurrentRound());

    // Wait a moment before showing sequence
    await this.sleep(1000);

    // Show each command in sequence
    const sequence = this.model.getSequence();
    for (const command of sequence) {
      await this.view.flashCommand(command, false);
      await this.sleep(200); // Gap between commands
    }

    // Switch to input mode
    this.model.setState("input");
    this.showInputPrompt();
  }

  private showInputPrompt(): void {
    this.view.showInputPrompt(
      this.model.getSequenceLength(),
      this.model.getPlayerInputLength()
    );
  }

  private gameOver(): void {
    this.model.setState("gameover");
    const sequenceLength = this.model.getSequenceLength();

    // Save high score to localStorage
    saveMinigameScore("simon-says", sequenceLength);

    this.view.showGameOver(
      this.model.getCurrentRound(),
      sequenceLength
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop(): void {
    window.removeEventListener("keydown", this.handleKeyPress);
    this.view.destroy();
    this.model.reset();
  }
}
