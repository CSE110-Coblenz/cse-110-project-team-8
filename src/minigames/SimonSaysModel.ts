// Model: Manages game state and business logic

export interface Command {
  key: string;
  displayName: string;
}

export type GameState = "showing" | "input" | "gameover";

export class SimonSaysModel {
  private sequence: Command[] = [];
  private playerInput: Command[] = [];
  private currentRound: number = 1;
  private state: GameState = "showing";

  // Available Vim commands for the sequence
  private readonly COMMANDS: Command[] = [
    { key: "h", displayName: "h" },
    { key: "j", displayName: "j" },
    { key: "k", displayName: "k" },
    { key: "l", displayName: "l" },
    { key: "i", displayName: "i" },
    { key: "Escape", displayName: "ESC" },
    { key: "x", displayName: "x" },
    { key: "d", displayName: "d" },
    { key: "w", displayName: "w" },
    { key: "q", displayName: "q" },
  ];

  getSequence(): Command[] {
    return [...this.sequence];
  }

  getPlayerInput(): Command[] {
    return [...this.playerInput];
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getState(): GameState {
    return this.state;
  }

  setState(state: GameState): void {
    this.state = state;
  }

  getSequenceLength(): number {
    return this.sequence.length;
  }

  getPlayerInputLength(): number {
    return this.playerInput.length;
  }

  addRandomCommandToSequence(): Command {
    const randomCommand = this.COMMANDS[Math.floor(Math.random() * this.COMMANDS.length)];
    this.sequence.push(randomCommand);
    return randomCommand;
  }

  addPlayerInput(command: Command): void {
    this.playerInput.push(command);
  }

  clearPlayerInput(): void {
    this.playerInput = [];
  }

  incrementRound(): void {
    this.currentRound++;
  }

  isValidCommand(key: string): Command | undefined {
    return this.COMMANDS.find(cmd => cmd.key === key);
  }

  isInputCorrect(): boolean {
    const currentIndex = this.playerInput.length - 1;
    if (currentIndex < 0 || currentIndex >= this.sequence.length) {
      return false;
    }
    return this.playerInput[currentIndex].key === this.sequence[currentIndex].key;
  }

  isSequenceComplete(): boolean {
    return this.playerInput.length === this.sequence.length;
  }

  reset(): void {
    this.sequence = [];
    this.playerInput = [];
    this.currentRound = 1;
    this.state = "showing";
  }
}
