import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { GridRenderer } from "./GridRenderer";
import { DataGenerator } from "../services/DataGenerator";
import { SelectionService } from "../services/SelectionService";
import { CanvasUtils } from "../utils/CanvasUtils";
import { CommandManager } from "../commands/CommandManager";
import { EditCellCommand } from "../commands/EditCellCommand";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand";
import { ResizeRowCommand } from "../commands/ResizeRowCommand";
import type { CellValue } from "./GridDataStore";
import {
  SelectionStatisticsService,
  type SelectionStatistics
} from "../services/SelectionStatisticsService";

export class Grid {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private renderer: GridRenderer;
  private selectionService: SelectionService;
  private commandManager: CommandManager;
  private statusBar: HTMLElement | null;
  private cellEditor: HTMLTextAreaElement | null;

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

  private isResizingRow: boolean;
  private resizingRowIndex: number | null;
  private resizingStartY: number;
  private resizingStartHeight: number;

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

    this.isResizingRow = false;
    this.resizingRowIndex = null;
    this.resizingStartY = 0;
    this.resizingStartHeight = 0;

    this.statusBar = document.getElementById("statusBar");
    this.cellEditor = document.getElementById(
      "cellEditor"
    ) as HTMLTextAreaElement | null;

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
        this.refreshCurrentSelectionStatusBar();
      });
    }

    if (redoButton) {
      redoButton.addEventListener("click", () => {
        this.commitCellEditor();
        this.commandManager.redo();
        this.limitScrollPosition();
        this.render();
        this.updateCellEditorPosition();
        this.refreshCurrentSelectionStatusBar();
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
      this.refreshCurrentSelectionStatusBar();
      return;
    }

    if (isRedo) {
      event.preventDefault();

      this.commitCellEditor();
      this.commandManager.redo();
      this.limitScrollPosition();
      this.render();
      this.updateCellEditorPosition();
      this.refreshCurrentSelectionStatusBar();
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

    const resizeRowIndex = this.getRowResizeIndex(mouseX, mouseY);

    if (resizeRowIndex !== null) {
      this.startRowResize(resizeRowIndex, mouseY);
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

    if (this.isResizingRow) {
      this.updateRowResize(mouseY);
      return;
    }

    const resizeColumnIndex = this.getColumnResizeIndex(mouseX, mouseY);
    const resizeRowIndex = this.getRowResizeIndex(mouseX, mouseY);

    if (resizeColumnIndex !== null) {
      this.canvas.style.cursor = "col-resize";
    } else if (resizeRowIndex !== null) {
      this.canvas.style.cursor = "row-resize";
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

    if (this.isResizingRow) {
      this.finishRowResize();
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

  private startRowResize(rowIndex: number, mouseY: number): void {
    this.commitCellEditor();

    this.isResizingRow = true;
    this.resizingRowIndex = rowIndex;
    this.resizingStartY = mouseY;
    this.resizingStartHeight = this.dataStore.getRowHeight(rowIndex);

    this.canvas.style.cursor = "row-resize";
  }

  private updateRowResize(mouseY: number): void {
    if (!this.isResizingRow || this.resizingRowIndex === null) {
      return;
    }

    const deltaY = mouseY - this.resizingStartY;

    const newHeight = Math.max(
      GridConfig.minRowHeight,
      this.resizingStartHeight + deltaY
    );

    this.dataStore.setRowHeight(this.resizingRowIndex, newHeight);
    this.limitScrollPosition();
    this.render();
    this.updateCellEditorPosition();
  }

  private finishRowResize(): void {
    if (!this.isResizingRow || this.resizingRowIndex === null) {
      return;
    }

    const newHeight = this.dataStore.getRowHeight(this.resizingRowIndex);
    const oldHeight = this.resizingStartHeight;

    if (newHeight !== oldHeight) {
      const command = new ResizeRowCommand(
        this.dataStore,
        this.resizingRowIndex,
        oldHeight,
        newHeight
      );

      this.commandManager.execute(command);
    }

    this.isResizingRow = false;
    this.resizingRowIndex = null;
    this.resizingStartY = 0;
    this.resizingStartHeight = 0;

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

      if (Math.abs(mouseX - columnRightEdge) <= resizeThreshold) {
        return columnIndex;
      }

      currentX += columnWidth;

      if (currentX > this.canvas.clientWidth + resizeThreshold) {
        break;
      }
    }

    return null;
  }

  private getRowResizeIndex(mouseX: number, mouseY: number): number | null {
    if (mouseX > GridConfig.rowHeaderWidth) {
      return null;
    }

    if (mouseY < GridConfig.columnHeaderHeight) {
      return null;
    }

    const resizeThreshold = 5;
    let currentY = GridConfig.columnHeaderHeight - this.scrollY;

    for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
      const rowHeight = this.dataStore.getRowHeight(rowIndex);
      const rowBottomEdge = currentY + rowHeight;

      if (Math.abs(mouseY - rowBottomEdge) <= resizeThreshold) {
        return rowIndex;
      }

      currentY += rowHeight;

      if (currentY > this.canvas.clientHeight + resizeThreshold) {
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

  private getRowIndexFromMouseY(mouseY: number): number | null {
    if (mouseY < GridConfig.columnHeaderHeight) {
      return null;
    }

    let currentY = GridConfig.columnHeaderHeight - this.scrollY;

    for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
      const rowHeight = this.dataStore.getRowHeight(rowIndex);

      if (mouseY >= currentY && mouseY <= currentY + rowHeight) {
        return rowIndex;
      }

      currentY += rowHeight;

      if (currentY > this.canvas.clientHeight) {
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
    const rowIndex = this.getRowIndexFromMouseY(mouseY);

    if (columnIndex === null || rowIndex === null) {
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
    const rowBounds = this.getRowBounds(rowIndex);

    if (!columnBounds || !rowBounds) {
      return;
    }

    const cellX = columnBounds.x;
    const cellY = rowBounds.y;

    const isVisible =
      cellX + columnBounds.width >= GridConfig.rowHeaderWidth &&
      cellX <= this.canvas.clientWidth &&
      cellY + rowBounds.height >= GridConfig.columnHeaderHeight &&
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
    this.cellEditor.style.height = `${rowBounds.height}px`;

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
    const rowBounds = this.getRowBounds(this.editingRow);

    if (!columnBounds || !rowBounds) {
      return;
    }

    const cellX = columnBounds.x;
    const cellY = rowBounds.y;

    const isVisible =
      cellX + columnBounds.width >= GridConfig.rowHeaderWidth &&
      cellX <= this.canvas.clientWidth &&
      cellY + rowBounds.height >= GridConfig.columnHeaderHeight &&
      cellY <= this.canvas.clientHeight;

    if (!isVisible) {
      this.cellEditor.style.display = "block";
      this.cellEditor.style.visibility = "visible";
      this.cellEditor.style.opacity = "0";
      this.cellEditor.style.pointerEvents = "none";
      return;
    }

    this.cellEditor.style.display = "block";
    this.cellEditor.style.visibility = "visible";
    this.cellEditor.style.opacity = "1";
    this.cellEditor.style.pointerEvents = "auto";
    this.cellEditor.style.left = `${cellX}px`;
    this.cellEditor.style.top = `${cellY}px`;
    this.cellEditor.style.width = `${columnBounds.width}px`;
    this.cellEditor.style.height = `${rowBounds.height}px`;
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

    return {
      x,
      width: this.dataStore.getColumnWidth(columnIndex)
    };
  }

  private getRowBounds(
    rowIndex: number
  ): { y: number; height: number } | null {
    if (rowIndex < 0 || rowIndex >= GridConfig.totalRows) {
      return null;
    }

    let y = GridConfig.columnHeaderHeight - this.scrollY;

    for (let index = 0; index < rowIndex; index++) {
      y += this.dataStore.getRowHeight(index);
    }

    return {
      y,
      height: this.dataStore.getRowHeight(rowIndex)
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
    this.refreshCurrentSelectionStatusBar();
  }

  private handleEditorKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter" && event.altKey) {
      event.preventDefault();

      if (!this.cellEditor) {
        return;
      }

      const selectionStart = this.cellEditor.selectionStart;
      const selectionEnd = this.cellEditor.selectionEnd;
      const currentValue = this.cellEditor.value;

      this.cellEditor.value =
        currentValue.substring(0, selectionStart) +
        "\n" +
        currentValue.substring(selectionEnd);

      const newCursorPosition = selectionStart + 1;
      this.cellEditor.setSelectionRange(newCursorPosition, newCursorPosition);
      return;
    }

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
    const rowIndex = this.getRowIndexFromMouseY(mouseY);

    if (rowIndex === null) {
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

    this.isSelectingRange = false;
    this.selectionService.setColumnSelection(columnIndex);
    this.updateColumnStatusBar(columnIndex);
    this.render();
  }

  private formatStatistics(statistics: SelectionStatistics): string {
    const average =
      statistics.count === 0 ? "-" : Number(statistics.average.toFixed(2));

    return `Count: ${statistics.count} | Sum: ${statistics.sum} | Avg: ${average} | Min: ${statistics.min ?? "-"
      } | Max: ${statistics.max ?? "-"}`;
  }

  private refreshCurrentSelectionStatusBar(): void {
    const selection = this.selectionService.getSelection();

    if (!selection) {
      this.resetStatusBar();
      return;
    }

    if (selection.type === "cell") {
      this.updateCellStatusBar(selection.startRow, selection.startColumn);
      return;
    }

    if (selection.type === "row") {
      this.updateRowStatusBar(selection.startRow);
      return;
    }

    if (selection.type === "column") {
      this.updateColumnStatusBar(selection.startColumn);
      return;
    }

    if (selection.type === "range") {
      this.updateRangeStatusBar(
        selection.startRow,
        selection.startColumn,
        selection.endRow,
        selection.endColumn
      );
    }
  }

  private updateCellStatusBar(rowIndex: number, columnIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const selection = this.selectionService.getSelection();

    const statistics = SelectionStatisticsService.calculate(
      selection,
      this.dataStore
    );

    const columnName = CanvasUtils.getColumnName(columnIndex);
    const rowNumber = rowIndex + 1;
    const selectedCellName = `${columnName}${rowNumber}`;

    this.statusBar.textContent = `Selected Cell: ${selectedCellName} | ${this.formatStatistics(
      statistics
    )}`;
  }

  private updateRowStatusBar(rowIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const selection = this.selectionService.getSelection();

    const statistics = SelectionStatisticsService.calculate(
      selection,
      this.dataStore
    );

    const rowNumber = rowIndex + 1;

    this.statusBar.textContent = `Selected Row: ${rowNumber} | ${this.formatStatistics(
      statistics
    )}`;
  }

  private updateColumnStatusBar(columnIndex: number): void {
    if (!this.statusBar) {
      return;
    }

    const selection = this.selectionService.getSelection();

    const statistics = SelectionStatisticsService.calculate(
      selection,
      this.dataStore
    );

    const columnName = CanvasUtils.getColumnName(columnIndex);

    this.statusBar.textContent = `Selected Column: ${columnName} | ${this.formatStatistics(
      statistics
    )}`;
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

    const endCellName = `${CanvasUtils.getColumnName(
      normalizedEndColumn
    )}${normalizedEndRow + 1}`;

    const selection = this.selectionService.getSelection();

    const statistics = SelectionStatisticsService.calculate(
      selection,
      this.dataStore
    );

    this.statusBar.textContent = `Selected Range: ${startCellName}:${endCellName} | ${this.formatStatistics(
      statistics
    )}`;
  }

  private resetStatusBar(): void {
    if (!this.statusBar) {
      return;
    }

    this.statusBar.textContent = this.formatStatistics({
      count: 0,
      sum: 0,
      average: 0,
      min: null,
      max: null
    });
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

  private getTotalRowsHeight(): number {
    let totalHeight = 0;

    for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
      totalHeight += this.dataStore.getRowHeight(rowIndex);
    }

    return totalHeight;
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
      this.getTotalRowsHeight() -
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