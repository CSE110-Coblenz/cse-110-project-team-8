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

        const key = event.key.toLowerCase();
        
        // Only allow up/down movement (j/k or arrow keys)
        if (key === "j" || key === "k" || event.key === "ArrowDown" || event.key === "ArrowUp") {
            super.handleInput(event);
            return;
        }
        
        // Ignore all other keys
    }
}

