import VimGrid, { Mode } from "./VimGrid.js";
import { VimController } from "./VimController.js";

export class LevelSelectController extends VimController {
    private onEnterCallback: (() => void) | null = null;

    constructor(vimGrid: VimGrid, onEnter: () => void) {
        super(vimGrid);
        this.onEnterCallback = onEnter;

        vimGrid.setMode(Mode.Normal); // We should always be in Normal mode
    }

    handleInput(event: KeyboardEvent): void {
        // Ignore modifier key combinations
        if (event.ctrlKey || event.metaKey || event.altKey) {
            return;
        }

        // Handle Enter key to start level
        if (event.key === "Enter") {
            if (this.onEnterCallback) {
                this.onEnterCallback();
            }
            return;
        }

        // Prevent 'i' from switching to Insert mode
        const key = event.key.toLowerCase();
        if (key === "i") {
            return;
        }

        // Call parent handleInput for all other keys (movement, etc.)
        // Parent will handle movement correctly in Normal mode
        super.handleInput(event);
    }
}

