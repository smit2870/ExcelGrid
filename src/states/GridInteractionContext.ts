import type { GridInteractionState } from "./GridInteractionState";

export interface MousePosition {
  x: number;
  y: number;
}

export interface GridInteractionContext {
  changeState(state: GridInteractionState): void;

  createIdleState(): GridInteractionState;
  createSelectingState(): GridInteractionState;
  createColumnResizeState(): GridInteractionState;
  createRowResizeState(): GridInteractionState;

  getMousePosition(event: MouseEvent): MousePosition;

  getColumnResizeIndex(
    mouseX: number,
    mouseY: number
  ): number | null;

  getRowResizeIndex(
    mouseX: number,
    mouseY: number
  ): number | null;

  commitCellEditor(): void;

  startColumnResize(
    columnIndex: number,
    mouseX: number
  ): void;

  updateColumnResize(mouseX: number): void;
  finishColumnResize(): void;

  startRowResize(
    rowIndex: number,
    mouseY: number
  ): void;

  updateRowResize(mouseY: number): void;
  finishRowResize(): void;

  clearSelection(): void;

  selectColumnFromHeader(mouseX: number): void;
  selectRowFromHeader(mouseY: number): void;

  startRangeSelection(
    mouseX: number,
    mouseY: number
  ): boolean;

  updateRangeSelection(
    mouseX: number,
    mouseY: number
  ): void;

  finishRangeSelection(): void;
  cancelSelection(): void;

  handleCellDoubleClick(
    mouseX: number,
    mouseY: number
  ): void;

  updateResizeUi(): void;
  savePersistedState(): void;
  setCursor(cursor: string): void;

  isTopLeftCorner(
    mouseX: number,
    mouseY: number
  ): boolean;

  isColumnHeader(
    mouseX: number,
    mouseY: number
  ): boolean;

  isRowHeader(
    mouseX: number,
    mouseY: number
  ): boolean;
}