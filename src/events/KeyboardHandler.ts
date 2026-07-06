export interface KeyboardHandlerCallbacks {
    onGlobalKeyDown(event: KeyboardEvent): void;
    onEditorKeyDown(event: KeyboardEvent): void;
}

export class KeyboardHandler {
    private editorElement: HTMLTextAreaElement | null;
    private callbacks: KeyboardHandlerCallbacks;

    constructor(
        editorElement: HTMLTextAreaElement | null,
        callbacks: KeyboardHandlerCallbacks
    ) {
        this.editorElement = editorElement;
        this.callbacks = callbacks;
    }

    attach(): void {
        window.addEventListener("keydown", (event: KeyboardEvent) => {
            this.callbacks.onGlobalKeyDown(event);
        });

        if (this.editorElement) {
            this.editorElement.addEventListener("keydown", (event: KeyboardEvent) => {
                this.callbacks.onEditorKeyDown(event);
            });
        }
    }
}