export interface MouseHandlerCallbacks {
    onWheel(event: WheelEvent): void;
    onMouseDown(event: MouseEvent): void;
    onMouseMove(event: MouseEvent): void;
    onDoubleClick(event: MouseEvent): void;
    onMouseUp(): void;
}

export class MouseHandler {
    private canvas: HTMLCanvasElement;
    private callbacks: MouseHandlerCallbacks;

    constructor(
        canvas: HTMLCanvasElement,
        callbacks: MouseHandlerCallbacks
    ) {
        this.canvas = canvas;
        this.callbacks = callbacks;
    }

    attach(): void {
        const gridContainer = this.canvas.parentElement;

        if (gridContainer) {
            gridContainer.addEventListener("wheel", (event: WheelEvent) => {
                this.callbacks.onWheel(event);
            });
        }

        this.canvas.addEventListener("mousedown", (event: MouseEvent) => {
            this.callbacks.onMouseDown(event);
        });

        this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
            this.callbacks.onMouseMove(event);
        });

        this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
            this.callbacks.onDoubleClick(event);
        });

        window.addEventListener("mouseup", () => {
            this.callbacks.onMouseUp();
        });
    }
}