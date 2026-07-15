export interface KeyboardHandlerCallbacks {
    onGlobalKeyDown(event: KeyboardEvent): void;
    onEditorKeyDown(event: KeyboardEvent): void;
}

export class KeyboardHandler {
    private editorElement: HTMLTextAreaElement | null;
    private callbacks: KeyboardHandlerCallbacks;
    private isAttached: boolean;

    constructor(
        editorElement: HTMLTextAreaElement | null,
        callbacks: KeyboardHandlerCallbacks
    ) {
        this.editorElement = editorElement;
        this.callbacks = callbacks;
        this.isAttached = false;
    }

    attach(): void {
        if (this.isAttached) {
            return;
        }

        window.addEventListener("keydown", this.handleGlobalKeyDown);

        if (this.editorElement) {
            this.editorElement.addEventListener("keydown", this.handleEditorKeyDown);
        }

        this.isAttached = true;
    }

    detach(): void {
        if (!this.isAttached) {
            return;
        }

        window.removeEventListener("keydown", this.handleGlobalKeyDown);

        if (this.editorElement) {
            this.editorElement.removeEventListener("keydown", this.handleEditorKeyDown);
        }

        this.isAttached = false;
    }

    private handleGlobalKeyDown = (event: KeyboardEvent): void => {
        this.callbacks.onGlobalKeyDown(event);
    };

    private handleEditorKeyDown = (event: KeyboardEvent): void => {
        this.callbacks.onEditorKeyDown(event);
    };
}