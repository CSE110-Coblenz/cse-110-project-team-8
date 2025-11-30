type ResetHandlers = {
  onConfirm?: () => void;
  onCancel?: () => void;
};

export class ResetModal {
  private root: HTMLDivElement;
  private confirmBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private handlers?: ResetHandlers;

  constructor() {
    this.root = document.createElement("div");
    this.root.className = "reset-overlay";
    this.root.innerHTML = `
      <div class="reset-card">
        <p class="reset-eyebrow">Danger Zone</p>
        <h2>Reset The Game?</h2>
        <p class="reset-body">This clears saved scores and levels on this device. This cannot be reverted.</p>
        <div class="reset-actions">
          <button id="resetCancel" class="reset-btn ghost">Cancel</button>
          <button id="resetConfirm" class="reset-btn primary">Confirm Reset</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.root);

    this.confirmBtn = this.root.querySelector("#resetConfirm") as HTMLButtonElement;
    this.cancelBtn = this.root.querySelector("#resetCancel") as HTMLButtonElement;

    this.confirmBtn.addEventListener("click", () => {
      this.handlers?.onConfirm?.();
      this.hide();
    });

    this.cancelBtn.addEventListener("click", () => {
      this.handlers?.onCancel?.();
      this.hide();
    });
  }

  show(handlers?: ResetHandlers) {
    this.handlers = handlers;
    this.root.classList.add("visible");
  }

  hide() {
    this.root.classList.remove("visible");
    this.handlers = undefined;
  }
}
