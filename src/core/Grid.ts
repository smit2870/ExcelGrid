import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { GridRenderer } from "./GridRenderer";
import { DataGenerator } from "../services/DataGenerator";
import { SelectionService } from "../services/SelectionService";
import { CanvasUtils } from "../utils/CanvasUtils";

export class Grid {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private renderer: GridRenderer;
  private selectionService: SelectionService;
  private statusBar: HTMLElement | null;

  private scrollX: number;
  private scrollY: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scrollX = 0;
    this.scrollY = 0;

    this.statusBar = document.getElementById("statusBar");

    this.dataStore = new GridDataStore(
      GridConfig.defaultRowHeight,
      GridConfig.defaultColumnWidth
    );

    this.selectionService = new SelectionService();
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

  private updateStatusBar(rowIndex: number, columnIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const columnName = CanvasUtils.getColumnName(columnIndex);
    const rowNumber = rowIndex + 1;
    const selectedCellName = `${columnName}${rowNumber}`;

    this.statusBar.textContent = `Selected Cell: ${selectedCellName} | Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -`;
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

    this.canvas.addEventListener("mousedown", (event: MouseEvent) => {
      this.handleMouseDown(event);
    });
  }

  private handleMouseDown(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const isInsideCellArea =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (!isInsideCellArea) {
      this.selectionService.clearSelection();

      if (this.statusBar) {
        this.statusBar.textContent =
          "Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -";
      }

      this.render();
      return;
    }

    const columnIndex = Math.floor(
      (mouseX - GridConfig.rowHeaderWidth + this.scrollX) /
        GridConfig.defaultColumnWidth
    );

    const rowIndex = Math.floor(
      (mouseY - GridConfig.columnHeaderHeight + this.scrollY) /
        GridConfig.defaultRowHeight
    );

    const isValidCell =
      rowIndex >= 0 &&
      rowIndex < GridConfig.totalRows &&
      columnIndex >= 0 &&
      columnIndex < GridConfig.totalColumns;

    if (!isValidCell) {
      return;
    }

    this.selectionService.setCellSelection(rowIndex, columnIndex);
    this.updateStatusBar(rowIndex, columnIndex);
    this.render();
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
    const selection = this.selectionService.getSelection();
    this.renderer.render(this.scrollX, this.scrollY, selection);
  }
}