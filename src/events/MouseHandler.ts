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
    private gridContainer: HTMLElement | null;
    private isAttached: boolean;

    constructor(
        canvas: HTMLCanvasElement,
        callbacks: MouseHandlerCallbacks
    ) {
        this.canvas = canvas;
        this.callbacks = callbacks;

        this.gridContainer = null;
        this.isAttached = false;
    }

    attach(): void {
        if (this.isAttached) {
            return;
        }

        this.gridContainer = this.canvas.parentElement;

        if (this.gridContainer) {
            this.gridContainer.addEventListener("wheel", this.handleWheel);
        }

        this.canvas.addEventListener("mousedown", this.handleMouseDown);
        this.canvas.addEventListener("mousemove", this.handleMouseMove);
        this.canvas.addEventListener("dblclick", this.handleDoubleClick);
        window.addEventListener("mouseup", this.handleMouseUp);

        this.isAttached = true;
    }

    detach(): void {
        if (!this.isAttached) {
            return;
        }

        if (this.gridContainer) {
            this.gridContainer.removeEventListener("wheel", this.handleWheel);
        }

        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("dblclick", this.handleDoubleClick);
        window.removeEventListener("mouseup", this.handleMouseUp);

        this.gridContainer = null;
        this.isAttached = false;
    }

    private handleWheel = (event: WheelEvent): void => {
        this.callbacks.onWheel(event);
    };

    private handleMouseDown = (event: MouseEvent): void => {
        this.callbacks.onMouseDown(event);
    };

    private handleMouseMove = (event: MouseEvent): void => {
        this.callbacks.onMouseMove(event);
    };

    private handleDoubleClick = (event: MouseEvent): void => {
        this.callbacks.onDoubleClick(event);
    };

    private handleMouseUp = (): void => {
        this.callbacks.onMouseUp();
    };
}