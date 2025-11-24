import { resetProgress } from "./progressStore.js";
import { ResetModal } from "./ResetModal.js";

let modal: ResetModal | undefined;

export function initResetButton(onReset?: () => void) {
  const btn = document.getElementById("resetBtn");
  if (!btn) return;
  modal = modal ?? new ResetModal();

  btn.addEventListener("click", () => {
    modal?.show({
      onConfirm: () => {
        resetProgress();
        onReset?.();
      },
    });
  });
}
