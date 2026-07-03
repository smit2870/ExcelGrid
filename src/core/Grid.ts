import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { GridRenderer } from "./GridRenderer";
import { DataGenerator } from "../services/DataGenerator";
import { SelectionService } from "../services/SelectionService";
import { CanvasUtils } from "../utils/CanvasUtils";
import { CommandManager } from "../commands/CommandManager";
import { EditCellCommand } from "../commands/EditCellCommand";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand";
import type { CellValue } from "./GridDataStore";

export class Grid {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private renderer: GridRenderer;
  private selectionService: SelectionService;
  private commandManager: CommandManager;
  private statusBar: HTMLElement | null;
  private cellEditor: HTMLInputElement | null;

  private scrollX: number;
  private scrollY: number;

  private isSelectingRange: boolean;
  private rangeStartRow: number;
  private rangeStartColumn: number;

  private editingRow: number | null;
  private editingColumn: number | null;

  private isResizingColumn: boolean;
  private resizingColumnIndex: number | null;
  private resizingStartX: number;
  private resizingStartWidth: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scrollX = 0;
    this.scrollY = 0;

    this.isSelectingRange = false;
    this.rangeStartRow = 0;
    this.rangeStartColumn = 0;

    this.editingRow = null;
    this.editingColumn = null;

    this.isResizingColumn = false;
    this.resizingColumnIndex = null;
    this.resizingStartX = 0;
    this.resizingStartWidth = 0;

    this.statusBar = document.getElementById("statusBar");
    this.cellEditor = document.getElementById(
      "cellEditor"
    ) as HTMLInputElement | null;

    this.dataStore = new GridDataStore(
      GridConfig.defaultRowHeight,
      GridConfig.defaultColumnWidth
    );

    this.selectionService = new SelectionService();
    this.commandManager = new CommandManager();
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
      this.limitScrollPosition();
      this.render();
      this.updateCellEditorPosition();
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
    const gridContainer = this.canvas.parentElement;

    if (gridContainer) {
      gridContainer.addEventListener("wheel", (event: WheelEvent) => {
        event.preventDefault();

        this.scrollX += event.deltaX;
        this.scrollY += event.deltaY;

        this.limitScrollPosition();
        this.render();
        this.updateCellEditorPosition();
      });
    }

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

    window.addEventListener("keydown", (event: KeyboardEvent) => {
      this.handleGlobalKeyDown(event);
    });

    const undoButton = document.getElementById("undoBtn");
    const redoButton = document.getElementById("redoBtn");

    if (undoButton) {
      undoButton.addEventListener("click", () => {
        this.commitCellEditor();
        this.commandManager.undo();
        this.limitScrollPosition();
        this.render();
        this.updateCellEditorPosition();
      });
    }

    if (redoButton) {
      redoButton.addEventListener("click", () => {
        this.commitCellEditor();
        this.commandManager.redo();
        this.limitScrollPosition();
        this.render();
        this.updateCellEditorPosition();
      });
    }

    if (this.cellEditor) {
      this.cellEditor.addEventListener("keydown", (event: KeyboardEvent) => {
        this.handleEditorKeyDown(event);
      });
    }
  }

  private handleGlobalKeyDown(event: KeyboardEvent): void {
    const isUndo = event.ctrlKey && event.key.toLowerCase() === "z";
    const isRedo = event.ctrlKey && event.key.toLowerCase() === "y";

    if (isUndo) {
      event.preventDefault();

      this.commitCellEditor();
      this.commandManager.undo();
      this.limitScrollPosition();
      this.render();
      this.updateCellEditorPosition();
      return;
    }

    if (isRedo) {
      event.preventDefault();

      this.commitCellEditor();
      this.commandManager.redo();
      this.limitScrollPosition();
      this.render();
      this.updateCellEditorPosition();
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const resizeColumnIndex = this.getColumnResizeIndex(mouseX, mouseY);

    if (resizeColumnIndex !== null) {
      this.startColumnResize(resizeColumnIndex, mouseX);
      return;
    }

    const isTopLeftCorner =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isTopLeftCorner) {
      this.commitCellEditor();
      this.selectionService.clearSelection();
      this.resetStatusBar();
      this.render();
      return;
    }

    const isColumnHeaderClick =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isColumnHeaderClick) {
      this.commitCellEditor();
      this.handleColumnHeaderClick(mouseX);
      return;
    }

    const isRowHeaderClick =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (isRowHeaderClick) {
      this.commitCellEditor();
      this.handleRowHeaderClick(mouseY);
      return;
    }

    this.commitCellEditor();
    this.startRangeSelection(mouseX, mouseY);
  }

  private handleMouseMove(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    if (this.isResizingColumn) {
      this.updateColumnResize(mouseX);
      return;
    }

    const resizeColumnIndex = this.getColumnResizeIndex(mouseX, mouseY);

    if (resizeColumnIndex !== null) {
      this.canvas.style.cursor = "col-resize";
    } else {
      this.canvas.style.cursor = "default";
    }

    if (!this.isSelectingRange) {
      return;
    }

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
    if (this.isResizingColumn) {
      this.finishColumnResize();
      return;
    }

    this.isSelectingRange = false;
  }

  private startColumnResize(columnIndex: number, mouseX: number): void {
    this.commitCellEditor();

    this.isResizingColumn = true;
    this.resizingColumnIndex = columnIndex;
    this.resizingStartX = mouseX;
    this.resizingStartWidth = this.dataStore.getColumnWidth(columnIndex);

    this.canvas.style.cursor = "col-resize";
  }

  private updateColumnResize(mouseX: number): void {
    if (!this.isResizingColumn || this.resizingColumnIndex === null) {
      return;
    }

    const deltaX = mouseX - this.resizingStartX;

    const newWidth = Math.max(
      GridConfig.minColumnWidth,
      this.resizingStartWidth + deltaX
    );

    this.dataStore.setColumnWidth(this.resizingColumnIndex, newWidth);
    this.limitScrollPosition();
    this.render();
    this.updateCellEditorPosition();
  }

  private finishColumnResize(): void {
    if (!this.isResizingColumn || this.resizingColumnIndex === null) {
      return;
    }

    const newWidth = this.dataStore.getColumnWidth(this.resizingColumnIndex);
    const oldWidth = this.resizingStartWidth;

    if (newWidth !== oldWidth) {
      const command = new ResizeColumnCommand(
        this.dataStore,
        this.resizingColumnIndex,
        oldWidth,
        newWidth
      );

      this.commandManager.execute(command);
    }

    this.isResizingColumn = false;
    this.resizingColumnIndex = null;
    this.resizingStartX = 0;
    this.resizingStartWidth = 0;

    this.canvas.style.cursor = "default";
    this.render();
    this.updateCellEditorPosition();
  }

  private getColumnResizeIndex(mouseX: number, mouseY: number): number | null {
    if (mouseY > GridConfig.columnHeaderHeight) {
      return null;
    }

    if (mouseX < GridConfig.rowHeaderWidth) {
      return null;
    }

    const resizeThreshold = 5;
    let currentX = GridConfig.rowHeaderWidth - this.scrollX;

    for (
      let columnIndex = 0;
      columnIndex < GridConfig.totalColumns;
      columnIndex++
    ) {
      const columnWidth = this.dataStore.getColumnWidth(columnIndex);
      const columnRightEdge = currentX + columnWidth;

      const isNearRightEdge =
        Math.abs(mouseX - columnRightEdge) <= resizeThreshold;

      if (isNearRightEdge) {
        return columnIndex;
      }

      currentX += columnWidth;

      if (currentX > this.canvas.clientWidth + resizeThreshold) {
        break;
      }
    }

    return null;
  }

  private getColumnIndexFromMouseX(mouseX: number): number | null {
    if (mouseX < GridConfig.rowHeaderWidth) {
      return null;
    }

    let currentX = GridConfig.rowHeaderWidth - this.scrollX;

    for (
      let columnIndex = 0;
      columnIndex < GridConfig.totalColumns;
      columnIndex++
    ) {
      const columnWidth = this.dataStore.getColumnWidth(columnIndex);

      if (mouseX >= currentX && mouseX <= currentX + columnWidth) {
        return columnIndex;
      }

      currentX += columnWidth;

      if (currentX > this.canvas.clientWidth) {
        break;
      }
    }

    return null;
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

    const columnIndex = this.getColumnIndexFromMouseX(mouseX);

    if (columnIndex === null) {
      return null;
    }

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

    const columnBounds = this.getColumnBounds(columnIndex);

    if (!columnBounds) {
      return;
    }

    const cellX = columnBounds.x;
    const cellY =
      GridConfig.columnHeaderHeight +
      rowIndex * GridConfig.defaultRowHeight -
      this.scrollY;

    const isVisible =
      cellX + columnBounds.width >= GridConfig.rowHeaderWidth &&
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
    this.cellEditor.style.visibility = "visible";
    this.cellEditor.style.opacity = "1";
    this.cellEditor.style.pointerEvents = "auto";
    this.cellEditor.style.left = `${cellX}px`;
    this.cellEditor.style.top = `${cellY}px`;
    this.cellEditor.style.width = `${columnBounds.width}px`;
    this.cellEditor.style.height = `${GridConfig.defaultRowHeight}px`;

    this.cellEditor.focus();
    this.cellEditor.select();
  }

  private updateCellEditorPosition(): void {
    if (!this.cellEditor) {
      return;
    }

    if (this.editingRow === null || this.editingColumn === null) {
      return;
    }

    const columnBounds = this.getColumnBounds(this.editingColumn);

    if (!columnBounds) {
      return;
    }

    const cellX = columnBounds.x;
    const cellY =
      GridConfig.columnHeaderHeight +
      this.editingRow * GridConfig.defaultRowHeight -
      this.scrollY;

    const isVisible =
      cellX + columnBounds.width >= GridConfig.rowHeaderWidth &&
      cellX <= this.canvas.clientWidth &&
      cellY + GridConfig.defaultRowHeight >= GridConfig.columnHeaderHeight &&
      cellY <= this.canvas.clientHeight;

    if (!isVisible) {
      this.cellEditor.style.display = "block";
      this.cellEditor.style.visibility = "visible";
      this.cellEditor.style.opacity = "0";
      this.cellEditor.style.pointerEvents = "none";

      if (document.activeElement !== this.cellEditor) {
        this.cellEditor.focus();

        const valueLength = this.cellEditor.value.length;
        this.cellEditor.setSelectionRange(valueLength, valueLength);
      }

      return;
    }

    this.cellEditor.style.display = "block";
    this.cellEditor.style.visibility = "visible";
    this.cellEditor.style.opacity = "1";
    this.cellEditor.style.pointerEvents = "auto";
    this.cellEditor.style.left = `${cellX}px`;
    this.cellEditor.style.top = `${cellY}px`;
    this.cellEditor.style.width = `${columnBounds.width}px`;
    this.cellEditor.style.height = `${GridConfig.defaultRowHeight}px`;

    if (document.activeElement !== this.cellEditor) {
      this.cellEditor.focus();

      const valueLength = this.cellEditor.value.length;
      this.cellEditor.setSelectionRange(valueLength, valueLength);
    }
  }

  private getColumnBounds(
    columnIndex: number
  ): { x: number; width: number } | null {
    if (columnIndex < 0 || columnIndex >= GridConfig.totalColumns) {
      return null;
    }

    let x = GridConfig.rowHeaderWidth - this.scrollX;

    for (let index = 0; index < columnIndex; index++) {
      x += this.dataStore.getColumnWidth(index);
    }

    const width = this.dataStore.getColumnWidth(columnIndex);

    return {
      x,
      width
    };
  }

  private hideCellEditor(): void {
    if (!this.cellEditor) {
      return;
    }

    this.cellEditor.style.display = "none";
    this.cellEditor.style.visibility = "visible";
    this.cellEditor.style.opacity = "1";
    this.cellEditor.style.pointerEvents = "auto";

    this.editingRow = null;
    this.editingColumn = null;
  }

  private commitCellEditor(): void {
    if (!this.cellEditor) {
      return;
    }

    if (this.editingRow === null || this.editingColumn === null) {
      return;
    }

    this.saveCellEditorValue();
  }

  private saveCellEditorValue(): void {
    if (!this.cellEditor) {
      return;
    }

    if (this.editingRow === null || this.editingColumn === null) {
      return;
    }

    const rowIndex = this.editingRow;
    const columnIndex = this.editingColumn;
    const oldValue = this.dataStore.getCellValue(rowIndex, columnIndex);

    const editorValue = this.cellEditor.value.trim();

    let newValue: CellValue;

    if (editorValue === "") {
      newValue = null;
    } else {
      const numericValue = Number(editorValue);
      newValue = Number.isNaN(numericValue) ? editorValue : numericValue;
    }

    const isSameValue = String(oldValue ?? "") === String(newValue ?? "");

    if (!isSameValue) {
      const command = new EditCellCommand(
        this.dataStore,
        rowIndex,
        columnIndex,
        oldValue,
        newValue
      );

      this.commandManager.execute(command);
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
    const columnIndex = this.getColumnIndexFromMouseX(mouseX);

    if (columnIndex === null) {
      return;
    }

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

  private getTotalColumnsWidth(): number {
    let totalWidth = 0;

    for (
      let columnIndex = 0;
      columnIndex < GridConfig.totalColumns;
      columnIndex++
    ) {
      totalWidth += this.dataStore.getColumnWidth(columnIndex);
    }

    return totalWidth;
  }

  private limitScrollPosition(): void {
    const maxScrollX = Math.max(
      0,
      this.getTotalColumnsWidth() -
        this.canvas.clientWidth +
        GridConfig.rowHeaderWidth
    );

    const maxScrollY = Math.max(
      0,
      GridConfig.totalRows * GridConfig.defaultRowHeight -
        this.canvas.clientHeight +
        GridConfig.columnHeaderHeight
    );

    this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
    this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
  }

  private render(): void {
    const selection = this.selectionService.getSelection();
    this.renderer.render(this.scrollX, this.scrollY, selection);
  }
}