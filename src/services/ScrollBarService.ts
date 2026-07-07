import { GridConfig } from "../core/GridConfig";

interface ScrollBarElements {
    horizontalTrack: HTMLElement | null;
    horizontalThumb: HTMLElement | null;
    verticalTrack: HTMLElement | null;
    verticalThumb: HTMLElement | null;
}

interface ScrollBarUpdateOptions {
    scrollX: number;
    scrollY: number;
    maxScrollX: number;
    maxScrollY: number;
    viewportWidth: number;
    viewportHeight: number;
}

export class ScrollBarService {
    private horizontalTrack: HTMLElement | null;
    private horizontalThumb: HTMLElement | null;
    private verticalTrack: HTMLElement | null;
    private verticalThumb: HTMLElement | null;

    private scrollX: number;
    private scrollY: number;
    private maxScrollX: number;
    private maxScrollY: number;

    private onScroll: (scrollX: number, scrollY: number) => void;

    constructor(
        elements: ScrollBarElements,
        onScroll: (scrollX: number, scrollY: number) => void
    ) {
        this.horizontalTrack = elements.horizontalTrack;
        this.horizontalThumb = elements.horizontalThumb;
        this.verticalTrack = elements.verticalTrack;
        this.verticalThumb = elements.verticalThumb;

        this.scrollX = 0;
        this.scrollY = 0;
        this.maxScrollX = 0;
        this.maxScrollY = 0;

        this.onScroll = onScroll;
    }

    attach(): void {
        this.attachHorizontalThumbDrag();
        this.attachVerticalThumbDrag();
        this.attachHorizontalTrackClick();
        this.attachVerticalTrackClick();
    }

    update(options: ScrollBarUpdateOptions): void {
        this.scrollX = options.scrollX;
        this.scrollY = options.scrollY;
        this.maxScrollX = options.maxScrollX;
        this.maxScrollY = options.maxScrollY;

        this.updateTrackLayout();
        this.updateHorizontalThumb(options.viewportWidth);
        this.updateVerticalThumb(options.viewportHeight);
    }

    private updateTrackLayout(): void {
        const scrollbarSize = 14;

        if (this.horizontalTrack) {
            this.horizontalTrack.style.left = `${GridConfig.rowHeaderWidth}px`;
            this.horizontalTrack.style.right = `${scrollbarSize}px`;
            this.horizontalTrack.style.bottom = "0";
            this.horizontalTrack.style.height = `${scrollbarSize}px`;
        }

        if (this.verticalTrack) {
            this.verticalTrack.style.top = `${GridConfig.columnHeaderHeight}px`;
            this.verticalTrack.style.right = "0";
            this.verticalTrack.style.bottom = `${scrollbarSize}px`;
            this.verticalTrack.style.width = `${scrollbarSize}px`;
        }
    }

    private updateHorizontalThumb(viewportWidth: number): void {
        if (!this.horizontalTrack || !this.horizontalThumb) {
            return;
        }

        const trackWidth = this.horizontalTrack.clientWidth;

        if (this.maxScrollX <= 0) {
            this.horizontalThumb.style.display = "none";
            return;
        }

        this.horizontalThumb.style.display = "block";

        const thumbWidth = this.getThumbSize(
            trackWidth,
            viewportWidth,
            viewportWidth + this.maxScrollX
        );

        const thumbLeft = this.getThumbPosition(
            this.scrollX,
            this.maxScrollX,
            trackWidth,
            thumbWidth
        );

        this.horizontalThumb.style.width = `${thumbWidth}px`;
        this.horizontalThumb.style.left = `${thumbLeft}px`;
    }

    private updateVerticalThumb(viewportHeight: number): void {
        if (!this.verticalTrack || !this.verticalThumb) {
            return;
        }

        const trackHeight = this.verticalTrack.clientHeight;

        if (this.maxScrollY <= 0) {
            this.verticalThumb.style.display = "none";
            return;
        }

        this.verticalThumb.style.display = "block";

        const thumbHeight = this.getThumbSize(
            trackHeight,
            viewportHeight,
            viewportHeight + this.maxScrollY
        );

        const thumbTop = this.getThumbPosition(
            this.scrollY,
            this.maxScrollY,
            trackHeight,
            thumbHeight
        );

        this.verticalThumb.style.height = `${thumbHeight}px`;
        this.verticalThumb.style.top = `${thumbTop}px`;
    }

    private getThumbSize(
        trackSize: number,
        viewportSize: number,
        contentSize: number
    ): number {
        const minimumThumbSize = 24;

        if (contentSize <= 0) {
            return trackSize;
        }

        return Math.max(
            minimumThumbSize,
            (viewportSize / contentSize) * trackSize
        );
    }

    private getThumbPosition(
        scrollPosition: number,
        maxScrollPosition: number,
        trackSize: number,
        thumbSize: number
    ): number {
        if (maxScrollPosition <= 0) {
            return 0;
        }

        const availableTrackSize = trackSize - thumbSize;

        return (scrollPosition / maxScrollPosition) * availableTrackSize;
    }

    private attachHorizontalThumbDrag(): void {
        if (!this.horizontalTrack || !this.horizontalThumb) {
            return;
        }

        this.horizontalThumb.addEventListener("mousedown", (event: MouseEvent) => {
            event.preventDefault();

            const startMouseX = event.clientX;
            const startScrollX = this.scrollX;

            const onMouseMove = (moveEvent: MouseEvent): void => {
                if (!this.horizontalTrack || !this.horizontalThumb) {
                    return;
                }

                const trackWidth = this.horizontalTrack.clientWidth;
                const thumbWidth = this.horizontalThumb.clientWidth;
                const availableTrackWidth = trackWidth - thumbWidth;

                if (availableTrackWidth <= 0) {
                    return;
                }

                const deltaX = moveEvent.clientX - startMouseX;
                const scrollDelta = (deltaX / availableTrackWidth) * this.maxScrollX;

                const nextScrollX = Math.max(
                    0,
                    Math.min(this.maxScrollX, startScrollX + scrollDelta)
                );

                this.onScroll(nextScrollX, this.scrollY);
            };

            const onMouseUp = (): void => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    }

    private attachVerticalThumbDrag(): void {
        if (!this.verticalTrack || !this.verticalThumb) {
            return;
        }

        this.verticalThumb.addEventListener("mousedown", (event: MouseEvent) => {
            event.preventDefault();

            const startMouseY = event.clientY;
            const startScrollY = this.scrollY;

            const onMouseMove = (moveEvent: MouseEvent): void => {
                if (!this.verticalTrack || !this.verticalThumb) {
                    return;
                }

                const trackHeight = this.verticalTrack.clientHeight;
                const thumbHeight = this.verticalThumb.clientHeight;
                const availableTrackHeight = trackHeight - thumbHeight;

                if (availableTrackHeight <= 0) {
                    return;
                }

                const deltaY = moveEvent.clientY - startMouseY;
                const scrollDelta = (deltaY / availableTrackHeight) * this.maxScrollY;

                const nextScrollY = Math.max(
                    0,
                    Math.min(this.maxScrollY, startScrollY + scrollDelta)
                );

                this.onScroll(this.scrollX, nextScrollY);
            };

            const onMouseUp = (): void => {
                window.removeEventListener("mousemove", onMouseMove);
                window.removeEventListener("mouseup", onMouseUp);
            };

            window.addEventListener("mousemove", onMouseMove);
            window.addEventListener("mouseup", onMouseUp);
        });
    }

    private attachHorizontalTrackClick(): void {
        if (!this.horizontalTrack) {
            return;
        }

        this.horizontalTrack.addEventListener("mousedown", (event: MouseEvent) => {
            if (event.target === this.horizontalThumb) {
                return;
            }

            if (!this.horizontalTrack || !this.horizontalThumb) {
                return;
            }

            const rect = this.horizontalTrack.getBoundingClientRect();
            const clickX = event.clientX - rect.left;

            const trackWidth = this.horizontalTrack.clientWidth;
            const thumbWidth = this.horizontalThumb.clientWidth;
            const availableTrackWidth = trackWidth - thumbWidth;

            if (availableTrackWidth <= 0) {
                return;
            }

            const nextScrollX =
                (clickX / trackWidth) * this.maxScrollX;

            this.onScroll(
                Math.max(0, Math.min(this.maxScrollX, nextScrollX)),
                this.scrollY
            );
        });
    }

    private attachVerticalTrackClick(): void {
        if (!this.verticalTrack) {
            return;
        }

        this.verticalTrack.addEventListener("mousedown", (event: MouseEvent) => {
            if (event.target === this.verticalThumb) {
                return;
            }

            if (!this.verticalTrack || !this.verticalThumb) {
                return;
            }

            const rect = this.verticalTrack.getBoundingClientRect();
            const clickY = event.clientY - rect.top;

            const trackHeight = this.verticalTrack.clientHeight;
            const thumbHeight = this.verticalThumb.clientHeight;
            const availableTrackHeight = trackHeight - thumbHeight;

            if (availableTrackHeight <= 0) {
                return;
            }

            const nextScrollY =
                (clickY / trackHeight) * this.maxScrollY;

            this.onScroll(
                this.scrollX,
                Math.max(0, Math.min(this.maxScrollY, nextScrollY))
            );
        });
    }
}