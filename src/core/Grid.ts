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

  private isSelectingRange: boolean;
  private rangeStartRow: number;
  private rangeStartColumn: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scrollX = 0;
    this.scrollY = 0;

    this.isSelectingRange = false;
    this.rangeStartRow = 0;
    this.rangeStartColumn = 0;

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

    this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
      this.handleMouseMove(event);
    });

    window.addEventListener("mouseup", () => {
      this.handleMouseUp();
    });
  }

  private handleMouseDown(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const isTopLeftCorner =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isTopLeftCorner) {
      this.selectionService.clearSelection();
      this.resetStatusBar();
      this.render();
      return;
    }

    const isColumnHeaderClick =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isColumnHeaderClick) {
      this.handleColumnHeaderClick(mouseX);
      return;
    }

    const isRowHeaderClick =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (isRowHeaderClick) {
      this.handleRowHeaderClick(mouseY);
      return;
    }

    this.startRangeSelection(mouseX, mouseY);
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isSelectingRange) {
      return;
    }

    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const cellPosition = this.getCellPositionFromMouse(mouseX, mouseY);

    if (!cellPosition) {
      return;
    }

    this.selectionService.setRangeSelection(
      this.rangeStartRow,
      this.rangeStartColumn,
      cellPosition.rowIndex,
      cellPosition.columnIndex
    );

    this.updateRangeStatusBar(
      this.rangeStartRow,
      this.rangeStartColumn,
      cellPosition.rowIndex,
      cellPosition.columnIndex
    );

    this.render();
  }

  private handleMouseUp(): void {
    this.isSelectingRange = false;
  }

  private startRangeSelection(mouseX: number, mouseY: number): void {
    const cellPosition = this.getCellPositionFromMouse(mouseX, mouseY);

    if (!cellPosition) {
      return;
    }

    this.isSelectingRange = true;
    this.rangeStartRow = cellPosition.rowIndex;
    this.rangeStartColumn = cellPosition.columnIndex;

    this.selectionService.setCellSelection(
      cellPosition.rowIndex,
      cellPosition.columnIndex
    );

    this.updateCellStatusBar(cellPosition.rowIndex, cellPosition.columnIndex);
    this.render();
  }

  private getCellPositionFromMouse(
    mouseX: number,
    mouseY: number
  ): { rowIndex: number; columnIndex: number } | null {
    const isInsideCellArea =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (!isInsideCellArea) {
      return null;
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
      return null;
    }

    return {
      rowIndex,
      columnIndex
    };
  }

  private handleRowHeaderClick(mouseY: number): void {
    const rowIndex = Math.floor(
      (mouseY - GridConfig.columnHeaderHeight + this.scrollY) /
        GridConfig.defaultRowHeight
    );

    const isValidRow = rowIndex >= 0 && rowIndex < GridConfig.totalRows;

    if (!isValidRow) {
      return;
    }

    this.isSelectingRange = false;
    this.selectionService.setRowSelection(rowIndex);
    this.updateRowStatusBar(rowIndex);
    this.render();
  }

  private handleColumnHeaderClick(mouseX: number): void {
    const columnIndex = Math.floor(
      (mouseX - GridConfig.rowHeaderWidth + this.scrollX) /
        GridConfig.defaultColumnWidth
    );

    const isValidColumn =
      columnIndex >= 0 && columnIndex < GridConfig.totalColumns;

    if (!isValidColumn) {
      return;
    }

    this.isSelectingRange = false;
    this.selectionService.setColumnSelection(columnIndex);
    this.updateColumnStatusBar(columnIndex);
    this.render();
  }

  private updateCellStatusBar(rowIndex: number, columnIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const columnName = CanvasUtils.getColumnName(columnIndex);
    const rowNumber = rowIndex + 1;
    const selectedCellName = `${columnName}${rowNumber}`;

    this.statusBar.textContent = `Selected Cell: ${selectedCellName} | Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -`;
  }

  private updateRowStatusBar(rowIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const rowNumber = rowIndex + 1;

    this.statusBar.textContent = `Selected Row: ${rowNumber} | Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -`;
  }

  private updateColumnStatusBar(columnIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const columnName = CanvasUtils.getColumnName(columnIndex);

    this.statusBar.textContent = `Selected Column: ${columnName} | Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -`;
  }

  private updateRangeStatusBar(
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number
  ): void {
    if (!this.statusBar) {
      return;
    }

    const normalizedStartRow = Math.min(startRow, endRow);
    const normalizedEndRow = Math.max(startRow, endRow);
    const normalizedStartColumn = Math.min(startColumn, endColumn);
    const normalizedEndColumn = Math.max(startColumn, endColumn);

    const startCellName = `${CanvasUtils.getColumnName(
      normalizedStartColumn
    )}${normalizedStartRow + 1}`;

    const endCellName = `${CanvasUtils.getColumnName(normalizedEndColumn)}${
      normalizedEndRow + 1
    }`;

    this.statusBar.textContent = `Selected Range: ${startCellName}:${endCellName} | Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -`;
  }

  private resetStatusBar(): void {
    if (!this.statusBar) {
      return;
    }

    this.statusBar.textContent =
      "Count: 0 | Sum: 0 | Avg: 0 | Min: - | Max: -";
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