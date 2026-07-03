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
  private cellEditor: HTMLInputElement | null;

  private scrollX: number;
  private scrollY: number;

  private isSelectingRange: boolean;
  private rangeStartRow: number;
  private rangeStartColumn: number;

  private editingRow: number | null;
  private editingColumn: number | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scrollX = 0;
    this.scrollY = 0;

    this.isSelectingRange = false;
    this.rangeStartRow = 0;
    this.rangeStartColumn = 0;

    this.editingRow = null;
    this.editingColumn = null;

    this.statusBar = document.getElementById("statusBar");
    this.cellEditor = document.getElementById(
      "cellEditor"
    ) as HTMLInputElement | null;

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
      this.hideCellEditor();
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

      this.hideCellEditor();

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

    this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
      this.handleDoubleClick(event);
    });

    window.addEventListener("mouseup", () => {
      this.handleMouseUp();
    });

    if (this.cellEditor) {
      this.cellEditor.addEventListener("keydown", (event: KeyboardEvent) => {
        this.handleEditorKeyDown(event);
      });

      this.cellEditor.addEventListener("blur", () => {
        this.saveCellEditorValue();
      });
    }
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
      this.hideCellEditor();
      this.render();
      return;
    }

    const isColumnHeaderClick =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isColumnHeaderClick) {
      this.hideCellEditor();
      this.handleColumnHeaderClick(mouseX);
      return;
    }

    const isRowHeaderClick =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (isRowHeaderClick) {
      this.hideCellEditor();
      this.handleRowHeaderClick(mouseY);
      return;
    }

    this.hideCellEditor();
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

  private handleDoubleClick(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);
    const cellPosition = this.getCellPositionFromMouse(
      mousePosition.x,
      mousePosition.y
    );

    if (!cellPosition) {
      return;
    }

    this.selectionService.setCellSelection(
      cellPosition.rowIndex,
      cellPosition.columnIndex
    );

    this.updateCellStatusBar(cellPosition.rowIndex, cellPosition.columnIndex);
    this.render();

    this.showCellEditor(cellPosition.rowIndex, cellPosition.columnIndex);
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

  private showCellEditor(rowIndex: number, columnIndex: number): void {
    if (!this.cellEditor) {
      return;
    }

    const cellX =
      GridConfig.rowHeaderWidth +
      columnIndex * GridConfig.defaultColumnWidth -
      this.scrollX;

    const cellY =
      GridConfig.columnHeaderHeight +
      rowIndex * GridConfig.defaultRowHeight -
      this.scrollY;

    const isVisible =
      cellX + GridConfig.defaultColumnWidth >= GridConfig.rowHeaderWidth &&
      cellX <= this.canvas.clientWidth &&
      cellY + GridConfig.defaultRowHeight >= GridConfig.columnHeaderHeight &&
      cellY <= this.canvas.clientHeight;

    if (!isVisible) {
      return;
    }

    const currentValue = this.dataStore.getCellValue(rowIndex, columnIndex);

    this.editingRow = rowIndex;
    this.editingColumn = columnIndex;

    this.cellEditor.value = currentValue === null ? "" : String(currentValue);

    this.cellEditor.style.display = "block";
    this.cellEditor.style.left = `${cellX}px`;
    this.cellEditor.style.top = `${cellY}px`;
    this.cellEditor.style.width = `${GridConfig.defaultColumnWidth}px`;
    this.cellEditor.style.height = `${GridConfig.defaultRowHeight}px`;

    this.cellEditor.focus();
    this.cellEditor.select();
  }

  private hideCellEditor(): void {
    if (!this.cellEditor) {
      return;
    }

    this.cellEditor.style.display = "none";
    this.editingRow = null;
    this.editingColumn = null;
  }

  private saveCellEditorValue(): void {
    if (!this.cellEditor) {
      return;
    }

    if (this.editingRow === null || this.editingColumn === null) {
      return;
    }

    const newValue = this.cellEditor.value.trim();

    if (newValue === "") {
      this.dataStore.clearCellValue(this.editingRow, this.editingColumn);
    } else {
      const numericValue = Number(newValue);
      const valueToSave = Number.isNaN(numericValue) ? newValue : numericValue;

      this.dataStore.setCellValue(
        this.editingRow,
        this.editingColumn,
        valueToSave
      );
    }

    this.hideCellEditor();
    this.render();
  }

  private handleEditorKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.saveCellEditorValue();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.hideCellEditor();
      this.render();
    }
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