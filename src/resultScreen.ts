export interface LevelResult {
  levelName: string;
  score: number;
  timeMs: number;
}

type ActionHandlers = {
  onContinue?: () => void;
  onExit?: () => void;
};

export class ResultScreen {
  private root: HTMLDivElement;
  private levelNameEl: HTMLElement;
  private scoreEl: HTMLElement;
  private timeEl: HTMLElement;
  private continueBtn: HTMLButtonElement;
  private exitBtn: HTMLButtonElement;
  private exitWarning: HTMLElement | null;
  private currentHandlers?: ActionHandlers;

  constructor() {
    this.root = document.createElement("div");
    this.root.id = "result-overlay";
    this.root.className = "result-overlay";
    this.root.innerHTML = `
      <div class="result-blur"></div>
      <div class="result-card">
        <div class="result-top-row">
          <div class="result-burst">✨</div>
          <div class="result-heading">
            <p class="result-eyebrow">Level Cleared</p>
          <h2 id="result-level-name">--</h2>
          </div>
          <div class="result-score-block">
            <div class="result-score-inline">
              <div class="result-score-pair">
                <span class="result-score-label">Score</span>
                <span id="result-score-value" class="result-score-value">--</span>
              </div>
              <div class="result-score-pair">
                <span class="result-score-label">Time</span>
                <span id="result-time" class="result-score-value subtle">--:--</span>
              </div>
            </div>
          </div>
        </div>

        <div class="result-actions">
          <button id="continueBtn" class="result-btn primary">Return to Game</button>
          <button id="exitBtn" class="result-btn ghost warn-trigger">Exit to Home</button>
        </div>
        <p class="exit-warning" aria-live="polite">You're about to lose this level's progress.</p>

        <div class="confetti"></div>
      </div>
    `;

    document.body.appendChild(this.root);

    this.levelNameEl = this.root.querySelector("#result-level-name") as HTMLElement;
    this.scoreEl = this.root.querySelector("#result-score-value") as HTMLElement;
    this.timeEl = this.root.querySelector("#result-time") as HTMLElement;
    this.continueBtn = this.root.querySelector("#continueBtn") as HTMLButtonElement;
    this.exitBtn = this.root.querySelector("#exitBtn") as HTMLButtonElement;
    this.exitWarning = this.root.querySelector(".exit-warning") as HTMLElement | null;

    this.continueBtn.addEventListener("click", () => {
      this.currentHandlers?.onContinue?.();
    });
    this.exitBtn.addEventListener("click", () => {
      this.currentHandlers?.onExit?.();
    });

    const exitWarningEl = this.exitWarning;
    this.exitBtn.addEventListener("mouseenter", () => {
      if (!exitWarningEl) return;
      exitWarningEl.classList.add("exit-hover");
    });
    this.exitBtn.addEventListener("mouseleave", () => {
      if (!exitWarningEl) return;
      exitWarningEl.classList.remove("exit-hover");
    });
  }

  show(result: LevelResult, handlers?: ActionHandlers) {
    this.currentHandlers = handlers;
    this.levelNameEl.textContent = result.levelName;
    this.scoreEl.textContent = result.score.toLocaleString();
    this.timeEl.textContent = this.formatTime(result.timeMs);
    this.root.classList.add("visible");
    this.launchConfetti();
  }

  hide() {
    this.root.classList.remove("visible");
    this.currentHandlers = undefined;
    const confettiContainer = this.root.querySelector(".confetti");
    if (confettiContainer) {
      confettiContainer.innerHTML = "";
    }
  }

  isVisible(): boolean {
    return this.root.classList.contains("visible");
  }

  private launchConfetti() {
    const confettiContainer = this.root.querySelector(".confetti");
    if (!confettiContainer) return;
    confettiContainer.innerHTML = "";
    const colors = ["#b245fc", "#22d3ee", "#fbbf24", "#fb7185", "#8b5cf6"];
    const pieces = 40;

    for (let i = 0; i < pieces; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      const color = colors[i % colors.length];
      const delay = Math.random() * 0.5;
      const duration = 1.7 + Math.random() * 0.8;
      piece.style.background = color;
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.animationDelay = `${delay}s`;
      piece.style.animationDuration = `${duration}s`;
      confettiContainer.appendChild(piece);
      setTimeout(() => piece.remove(), (delay + duration) * 1000);
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(1, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }
}
