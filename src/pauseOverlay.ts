export interface PauseData {
  levelName: string;
  score: number;
  timeMs: number;
}

type PauseHandlers = {
  onResume?: () => void;
  onExit?: () => void;
};

export class PauseOverlay {
  private root: HTMLDivElement;
  private headingEl: HTMLElement;
  private levelEl: HTMLElement;
  private scoreEl: HTMLElement;
  private timeEl: HTMLElement;
  private resumeBtn: HTMLButtonElement;
  private exitBtn: HTMLButtonElement;
  private handlers?: PauseHandlers;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "pause-overlay";
    this.root.innerHTML = `
      <div class="pause-card">
        <div class="pause-header">
          <p class="pause-eyebrow">Current Level</p>
          <h2 id="pause-level-name">--</h2>
        </div>
        <div class="pause-status">
          <span class="pause-dot"></span>
          <p id="pause-heading">Game Paused</p>
        </div>
        <div class="pause-metrics">
          <div class="pause-pair">
            <span class="pause-label">Score</span>
            <span id="pause-score" class="pause-value">--</span>
          </div>
          <div class="pause-divider"></div>
          <div class="pause-pair">
            <span class="pause-label">Time</span>
            <span id="pause-time" class="pause-value subtle">--:--</span>
          </div>
        </div>
        <div class="pause-actions">
          <button id="pause-resume" class="pause-btn primary">Return to Game</button>
          <button id="pause-exit" class="pause-btn ghost warn-trigger">Exit to Home</button>
        </div>
        <p class="exit-warning" aria-live="polite">You will lose this level's progress.</p>
      </div>
    `;
    document.body.appendChild(this.root);

    this.headingEl = this.root.querySelector("#pause-heading") as HTMLElement;
    this.levelEl = this.root.querySelector("#pause-level-name") as HTMLElement;
    this.scoreEl = this.root.querySelector("#pause-score") as HTMLElement;
    this.timeEl = this.root.querySelector("#pause-time") as HTMLElement;
    this.resumeBtn = this.root.querySelector("#pause-resume") as HTMLButtonElement;
    this.exitBtn = this.root.querySelector("#pause-exit") as HTMLButtonElement;

    this.resumeBtn.addEventListener("click", () => {
      this.handlers?.onResume?.();
    });
    this.exitBtn.addEventListener("click", () => {
      this.handlers?.onExit?.();
    });

    const exitWarningEl = this.root.querySelector(".exit-warning") as HTMLElement | null;
    this.exitBtn.addEventListener("mouseenter", () => {
      if (!exitWarningEl) return;
      exitWarningEl.classList.add("exit-hover");
    });
    this.exitBtn.addEventListener("mouseleave", () => {
      if (!exitWarningEl) return;
      exitWarningEl.classList.remove("exit-hover");
    });
    
    }
  show(data: PauseData, handlers?: PauseHandlers) {
    this.handlers = handlers;
    this.levelEl.textContent = data.levelName;
    this.scoreEl.textContent = data.score.toLocaleString();
    this.timeEl.textContent = this.formatTime(data.timeMs);
    this.root.classList.add("visible");
  }

  hide() {
    this.root.classList.remove("visible");
    this.handlers = undefined;
  }

  isVisible(): boolean {
    return this.root.classList.contains("visible");
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
