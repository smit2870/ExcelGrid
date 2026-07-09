import type { CoordinateService } from "../services/CoordinateService";
import type { CellEditorService } from "../services/CellEditorService";
import { ScrollBarService } from "../services/ScrollBarService";
import { GridConfig } from "../core/GridConfig";

export interface ScrollPosition {
  scrollX: number;
  scrollY: number;
}

interface GridScrollManagerCallbacks {
  render(): void;
}

export class GridScrollManager {
  private canvas: HTMLCanvasElement;
  private coordinateService: CoordinateService;
  private cellEditorService: CellEditorService;
  private scrollBarService: ScrollBarService;
  private callbacks: GridScrollManagerCallbacks;

  private scrollX: number;
  private scrollY: number;

  constructor(
    canvas: HTMLCanvasElement,
    coordinateService: CoordinateService,
    cellEditorService: CellEditorService,
    callbacks: GridScrollManagerCallbacks
  ) {
    this.canvas = canvas;
    this.coordinateService = coordinateService;
    this.cellEditorService = cellEditorService;
    this.callbacks = callbacks;

    this.scrollX = 0;
    this.scrollY = 0;

    this.scrollBarService = new ScrollBarService(
      {
        horizontalTrack: document.getElementById("horizontalScrollbar"),
        horizontalThumb: document.getElementById("horizontalScrollThumb"),
        verticalTrack: document.getElementById("verticalScrollbar"),
        verticalThumb: document.getElementById("verticalScrollThumb")
      },
      (scrollX: number, scrollY: number) => {
        this.scrollX = scrollX;
        this.scrollY = scrollY;

        this.limitScrollPosition();
        this.callbacks.render();
        this.updateCellEditorPosition();
        this.updateScrollBars();
      }
    );
  }

  attach(): void {
    this.scrollBarService.attach();
  }

  getScrollPosition(): ScrollPosition {
    return {
      scrollX: this.scrollX,
      scrollY: this.scrollY
    };
  }

  setScrollPosition(scrollX: number, scrollY: number): void {
    this.scrollX = scrollX;
    this.scrollY = scrollY;
  }

  handleWheel(event: WheelEvent): void {
    event.preventDefault();

    this.scrollX += event.deltaX;
    this.scrollY += event.deltaY;

    this.limitScrollPosition();
    this.callbacks.render();
    this.updateCellEditorPosition();
    this.updateScrollBars();
  }

  updateCellEditorPosition(): void {
    this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
  }

  limitScrollPosition(): void {
    const maxScrollX = Math.max(
      0,
      this.getTotalColumnsWidth() -
        this.canvas.clientWidth +
        GridConfig.rowHeaderWidth
    );

    const maxScrollY = Math.max(
      0,
      this.getTotalRowsHeight() -
        this.canvas.clientHeight +
        GridConfig.columnHeaderHeight
    );

    this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
    this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
  }

  updateScrollBars(): void {
    const maxScrollX = Math.max(
      0,
      this.getTotalColumnsWidth() -
        this.canvas.clientWidth +
        GridConfig.rowHeaderWidth
    );

    const maxScrollY = Math.max(
      0,
      this.getTotalRowsHeight() -
        this.canvas.clientHeight +
        GridConfig.columnHeaderHeight
    );

    this.scrollBarService.update({
      scrollX: this.scrollX,
      scrollY: this.scrollY,
      maxScrollX,
      maxScrollY,
      viewportWidth: this.canvas.clientWidth,
      viewportHeight: this.canvas.clientHeight
    });
  }

  private getTotalColumnsWidth(): number {
    return this.coordinateService.getTotalColumnsWidth();
  }

  private getTotalRowsHeight(): number {
    return this.coordinateService.getTotalRowsHeight();
  }
}