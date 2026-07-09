import { GridConfig } from "../core/GridConfig";
import type { GridDataStore } from "../core/GridDataStore";
import type { CoordinateService } from "../services/CoordinateService";
import type { SelectionService } from "../services/SelectionService";
import type { KeyboardNavigationService } from "../services/KeyboardNavigationService";

interface ScrollPosition {
  scrollX: number;
  scrollY: number;
}

interface SelectionManagerCallbacks {
  getScrollPosition(): ScrollPosition;
  setScrollPosition(scrollX: number, scrollY: number): void;
  limitScrollPosition(): void;
  render(): void;
  updateScrollBars(): void;
  updateSelectionDependentUi(): void;
  scheduleSelectionDependentUiUpdate(): void;
  flushSelectionDependentUiUpdate(): void;
  updateCellEditorPosition(): void;
}

export class SelectionManager {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private selectionService: SelectionService;
  private coordinateService: CoordinateService;
  private keyboardNavigationService: KeyboardNavigationService;
  private callbacks: SelectionManagerCallbacks;

  private isSelectingRange: boolean;
  private rangeStartRow: number;
  private rangeStartColumn: number;

  private selectionAutoScrollFrameId: number | null;
  private lastSelectionMouseX: number;
  private lastSelectionMouseY: number;

  constructor(
    canvas: HTMLCanvasElement,
    dataStore: GridDataStore,
    selectionService: SelectionService,
    coordinateService: CoordinateService,
    keyboardNavigationService: KeyboardNavigationService,
    callbacks: SelectionManagerCallbacks
  ) {
    this.canvas = canvas;
    this.dataStore = dataStore;
    this.selectionService = selectionService;
    this.coordinateService = coordinateService;
    this.keyboardNavigationService = keyboardNavigationService;
    this.callbacks = callbacks;

    this.isSelectingRange = false;
    this.rangeStartRow = 0;
    this.rangeStartColumn = 0;

    this.selectionAutoScrollFrameId = null;
    this.lastSelectionMouseX = 0;
    this.lastSelectionMouseY = 0;
  }

  isRangeSelectionActive(): boolean {
    return this.isSelectingRange;
  }

  startRangeSelection(mouseX: number, mouseY: number): void {
    const cellPosition = this.getCellPositionFromMouse(mouseX, mouseY);

    if (!cellPosition) {
      return;
    }

    this.isSelectingRange = true;
    this.rangeStartRow = cellPosition.rowIndex;
    this.rangeStartColumn = cellPosition.columnIndex;

    this.lastSelectionMouseX = mouseX;
    this.lastSelectionMouseY = mouseY;

    this.selectionService.setCellSelection(
      cellPosition.rowIndex,
      cellPosition.columnIndex
    );

    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();
    this.callbacks.updateScrollBars();
  }

  handleMouseMove(mouseX: number, mouseY: number): boolean {
    if (!this.isSelectingRange) {
      return false;
    }

    this.lastSelectionMouseX = mouseX;
    this.lastSelectionMouseY = mouseY;

    this.updateRangeSelectionFromMouse(mouseX, mouseY);
    this.startSelectionAutoScroll();

    this.callbacks.render();
    this.callbacks.scheduleSelectionDependentUiUpdate();

    return true;
  }

  handleMouseUp(): boolean {
    if (!this.isSelectingRange) {
      this.stopSelectionAutoScroll();
      return false;
    }

    this.isSelectingRange = false;
    this.stopSelectionAutoScroll();

    this.callbacks.flushSelectionDependentUiUpdate();
    this.callbacks.updateScrollBars();

    return true;
  }

  cancelSelection(): void {
    this.isSelectingRange = false;
    this.stopSelectionAutoScroll();
  }

  selectAllData(): void {
    const usedRange = this.dataStore.getUsedRange();

    if (!usedRange) {
      return;
    }

    this.selectionService.setRangeSelection(
      usedRange.startRow,
      usedRange.startColumn,
      usedRange.endRow,
      usedRange.endColumn
    );

    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();
    this.callbacks.updateCellEditorPosition();
    this.callbacks.updateScrollBars();
  }

  selectRowFromHeader(mouseY: number): void {
    const rowIndex = this.getRowIndexFromMouseY(mouseY);

    if (rowIndex === null) {
      return;
    }

    this.cancelSelection();

    this.selectionService.setRowSelection(rowIndex);

    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();
    this.callbacks.updateScrollBars();
  }

  selectColumnFromHeader(mouseX: number): void {
    const columnIndex = this.getColumnIndexFromMouseX(mouseX);

    if (columnIndex === null) {
      return;
    }

    this.cancelSelection();

    this.selectionService.setColumnSelection(columnIndex);

    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();
    this.callbacks.updateScrollBars();
  }

  navigateFromNameBox(value: string): void {
    const parsedReference = this.parseNameBoxReference(value);

    if (!parsedReference) {
      this.callbacks.updateSelectionDependentUi();
      return;
    }

    if (parsedReference.type === "cell") {
      this.selectionService.setCellSelection(
        parsedReference.startRow,
        parsedReference.startColumn
      );

      this.scrollToCell(parsedReference.startRow, parsedReference.startColumn);
    }

    if (parsedReference.type === "range") {
      this.selectionService.setRangeSelection(
        parsedReference.startRow,
        parsedReference.startColumn,
        parsedReference.endRow,
        parsedReference.endColumn
      );

      this.scrollToCell(parsedReference.startRow, parsedReference.startColumn);
    }

    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();
    this.callbacks.updateCellEditorPosition();
    this.callbacks.updateScrollBars();
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

  private updateRangeSelectionFromMouse(mouseX: number, mouseY: number): void {
    const clampedPosition = this.getClampedSelectionMousePosition(
      mouseX,
      mouseY
    );

    const cellPosition = this.getCellPositionFromMouse(
      clampedPosition.x,
      clampedPosition.y
    );

    if (!cellPosition) {
      return;
    }

    this.selectionService.setRangeSelection(
      this.rangeStartRow,
      this.rangeStartColumn,
      cellPosition.rowIndex,
      cellPosition.columnIndex
    );
  }

  private getClampedSelectionMousePosition(
    mouseX: number,
    mouseY: number
  ): { x: number; y: number } {
    const scrollbarSize = 14;

    const minX = GridConfig.rowHeaderWidth;
    const maxX = this.canvas.clientWidth - scrollbarSize - 1;

    const minY = GridConfig.columnHeaderHeight;
    const maxY = this.canvas.clientHeight - scrollbarSize - 1;

    return {
      x: Math.max(minX, Math.min(mouseX, maxX)),
      y: Math.max(minY, Math.min(mouseY, maxY))
    };
  }

  private startSelectionAutoScroll(): void {
    if (this.selectionAutoScrollFrameId !== null) {
      return;
    }

    const autoScroll = (): void => {
      if (!this.isSelectingRange) {
        this.stopSelectionAutoScroll();
        return;
      }

      const scrollDelta = this.getSelectionAutoScrollDelta();

      const hasScrollDelta =
        scrollDelta.deltaX !== 0 || scrollDelta.deltaY !== 0;

      if (hasScrollDelta) {
        const currentScroll = this.callbacks.getScrollPosition();

        this.callbacks.setScrollPosition(
          currentScroll.scrollX + scrollDelta.deltaX,
          currentScroll.scrollY + scrollDelta.deltaY
        );

        this.callbacks.limitScrollPosition();

        this.updateRangeSelectionFromMouse(
          this.lastSelectionMouseX,
          this.lastSelectionMouseY
        );

        this.callbacks.render();
        this.callbacks.updateScrollBars();
        this.callbacks.scheduleSelectionDependentUiUpdate();
      }

      this.selectionAutoScrollFrameId =
        window.requestAnimationFrame(autoScroll);
    };

    this.selectionAutoScrollFrameId = window.requestAnimationFrame(autoScroll);
  }

  private stopSelectionAutoScroll(): void {
    if (this.selectionAutoScrollFrameId === null) {
      return;
    }

    window.cancelAnimationFrame(this.selectionAutoScrollFrameId);
    this.selectionAutoScrollFrameId = null;
  }

  private getSelectionAutoScrollDelta(): {
    deltaX: number;
    deltaY: number;
  } {
    const edgeThreshold = 36;
    const maxSpeed = 22;
    const scrollbarSize = 14;

    let deltaX = 0;
    let deltaY = 0;

    const leftEdge = GridConfig.rowHeaderWidth + edgeThreshold;
    const rightEdge = this.canvas.clientWidth - scrollbarSize - edgeThreshold;

    const topEdge = GridConfig.columnHeaderHeight + edgeThreshold;
    const bottomEdge = this.canvas.clientHeight - scrollbarSize - edgeThreshold;

    if (this.lastSelectionMouseX < leftEdge) {
      const distance = leftEdge - this.lastSelectionMouseX;
      deltaX = -this.getAutoScrollSpeed(distance, edgeThreshold, maxSpeed);
    }

    if (this.lastSelectionMouseX > rightEdge) {
      const distance = this.lastSelectionMouseX - rightEdge;
      deltaX = this.getAutoScrollSpeed(distance, edgeThreshold, maxSpeed);
    }

    if (this.lastSelectionMouseY < topEdge) {
      const distance = topEdge - this.lastSelectionMouseY;
      deltaY = -this.getAutoScrollSpeed(distance, edgeThreshold, maxSpeed);
    }

    if (this.lastSelectionMouseY > bottomEdge) {
      const distance = this.lastSelectionMouseY - bottomEdge;
      deltaY = this.getAutoScrollSpeed(distance, edgeThreshold, maxSpeed);
    }

    return {
      deltaX,
      deltaY
    };
  }

  private getAutoScrollSpeed(
    distance: number,
    threshold: number,
    maxSpeed: number
  ): number {
    const normalizedDistance = Math.min(distance / threshold, 1);

    return Math.ceil(normalizedDistance * maxSpeed);
  }

  private getColumnIndexFromMouseX(mouseX: number): number | null {
    const { scrollX } = this.callbacks.getScrollPosition();

    return this.coordinateService.getColumnIndexFromMouseX(mouseX, scrollX);
  }

  private getRowIndexFromMouseY(mouseY: number): number | null {
    const { scrollY } = this.callbacks.getScrollPosition();

    return this.coordinateService.getRowIndexFromMouseY(mouseY, scrollY);
  }

  private parseNameBoxReference(
    value: string
  ):
    | {
        type: "cell";
        startRow: number;
        startColumn: number;
        endRow: number;
        endColumn: number;
      }
    | {
        type: "range";
        startRow: number;
        startColumn: number;
        endRow: number;
        endColumn: number;
      }
    | null {
    const normalizedValue = value.trim().toUpperCase();

    if (normalizedValue === "") {
      return null;
    }

    const parts = normalizedValue.split(":");

    if (parts.length === 1) {
      const cell = this.parseCellReference(parts[0] ?? "");

      if (!cell) {
        return null;
      }

      return {
        type: "cell",
        startRow: cell.rowIndex,
        startColumn: cell.columnIndex,
        endRow: cell.rowIndex,
        endColumn: cell.columnIndex
      };
    }

    if (parts.length === 2) {
      const startCell = this.parseCellReference(parts[0] ?? "");
      const endCell = this.parseCellReference(parts[1] ?? "");

      if (!startCell || !endCell) {
        return null;
      }

      return {
        type: "range",
        startRow: startCell.rowIndex,
        startColumn: startCell.columnIndex,
        endRow: endCell.rowIndex,
        endColumn: endCell.columnIndex
      };
    }

    return null;
  }

  private parseCellReference(
    value: string
  ): { rowIndex: number; columnIndex: number } | null {
    const match = value.match(/^([A-Z]+)([1-9][0-9]*)$/);

    if (!match) {
      return null;
    }

    const columnName = match[1] ?? "";
    const rowNumber = Number(match[2] ?? "0");

    const columnIndex = this.getColumnIndexFromName(columnName);
    const rowIndex = rowNumber - 1;

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

  private getColumnIndexFromName(columnName: string): number {
    let columnIndex = 0;

    for (let index = 0; index < columnName.length; index++) {
      const characterCode = columnName.charCodeAt(index) - 64;
      columnIndex = columnIndex * 26 + characterCode;
    }

    return columnIndex - 1;
  }

  private scrollToCell(rowIndex: number, columnIndex: number): void {
    const currentScroll = this.callbacks.getScrollPosition();

    const updatedScroll = this.keyboardNavigationService.ensureCellVisible(
      rowIndex,
      columnIndex,
      currentScroll.scrollX,
      currentScroll.scrollY
    );

    this.callbacks.setScrollPosition(
      updatedScroll.scrollX,
      updatedScroll.scrollY
    );

    this.callbacks.limitScrollPosition();
  }
}