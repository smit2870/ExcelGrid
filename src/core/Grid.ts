import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { GridRenderer } from "./GridRenderer";
import { DataGenerator } from "../services/DataGenerator";

export class Grid {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private renderer: GridRenderer;

  private scrollX: number = 0;
  private scrollY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.dataStore = new GridDataStore(
      GridConfig.defaultRowHeight,
      GridConfig.defaultColumnWidth
    );

    this.renderer = new GridRenderer(this.canvas, this.dataStore);

    this.initializeCanvas();
    this.loadData();
    this.attachEvents();
    this.render();
  }

  private initializeCanvas(): void {
    this.resizeCanvas();

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.render();
    });
  }

  private resizeCanvas(): void {
    const parent = this.canvas.parentElement;

    if (!parent) {
      return;
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    this.canvas.width = rect.width * devicePixelRatio;
    this.canvas.height = rect.height * devicePixelRatio;

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    const context = this.canvas.getContext("2d");

    if (context) {
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }
  }

  private loadData(): void {
    const records = DataGenerator.generate(50000);
    this.dataStore.loadEmployeeRecords(records);
  }

  private attachEvents(): void {
    this.canvas.addEventListener("wheel", (event: WheelEvent) => {
      event.preventDefault();

      this.scrollX += event.deltaX;
      this.scrollY += event.deltaY;

      this.limitScrollPosition();
      this.render();
    });
  }

  private limitScrollPosition(): void {
    const maxScrollX =
      GridConfig.totalColumns * GridConfig.defaultColumnWidth -
      this.canvas.clientWidth +
      GridConfig.rowHeaderWidth;

    const maxScrollY =
      GridConfig.totalRows * GridConfig.defaultRowHeight -
      this.canvas.clientHeight +
      GridConfig.columnHeaderHeight;

    this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
    this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
  }

  private render(): void {
    this.renderer.render(this.scrollX, this.scrollY);
  }
}