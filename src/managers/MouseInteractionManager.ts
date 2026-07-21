import { GridConfig } from "../core/GridConfig";

import type { CoordinateService } from "../services/CoordinateService";
import type { ResizeService } from "../services/ResizeService";
import type { SelectionService } from "../services/SelectionService";
import type { CellEditorService } from "../services/CellEditorService";
import type { StatusBarService } from "../services/StatusBarService";
import type { FormulaBarService } from "../services/FormulaBarService";

import type { SelectionManager } from "./SelectionManager";
import type { GridScrollManager } from "./GridScrollManager";

import { CanvasUtils } from "../utils/CanvasUtils";
import type {  GridInteractionContext,  MousePosition} from "../states/GridInteractionContext";
import type { GridInteractionState } from "../states/GridInteractionState";
import { IdleInteractionState } from "../states/IdleInteractionState";
import { SelectingInteractionState } from "../states/SelectingInteractionState";
import { ColumnResizeInteractionState } from "../states/ColumnResizeInteractionState";
import { RowResizeInteractionState } from "../states/RowResizeInteractionState";
import { DisposedInteractionState } from "../states/DisposedInteractionState";

interface MouseInteractionManagerCallbacks {
  commitCellEditor(): void;
  render(): void;
  updateSelectionDependentUi(): void;
  savePersistedState(): void;
}

export class MouseInteractionManager
  implements GridInteractionContext {
  private canvas: HTMLCanvasElement;
  private coordinateService: CoordinateService;
  private resizeService: ResizeService;
  private selectionService: SelectionService;
  private cellEditorService: CellEditorService;
  private statusBarService: StatusBarService;
  private formulaBarService: FormulaBarService;
  private selectionManager: SelectionManager;
  private gridScrollManager: GridScrollManager;
  private callbacks: MouseInteractionManagerCallbacks;

  private currentState: GridInteractionState;
  private isDisposed: boolean;

  constructor(
    canvas: HTMLCanvasElement,
    coordinateService: CoordinateService,
    resizeService: ResizeService,
    selectionService: SelectionService,
    cellEditorService: CellEditorService,
    statusBarService: StatusBarService,
    formulaBarService: FormulaBarService,
    selectionManager: SelectionManager,
    gridScrollManager: GridScrollManager,
    callbacks: MouseInteractionManagerCallbacks
  ) {
    this.canvas = canvas;
    this.coordinateService = coordinateService;
    this.resizeService = resizeService;
    this.selectionService = selectionService;
    this.cellEditorService = cellEditorService;
    this.statusBarService = statusBarService;
    this.formulaBarService = formulaBarService;
    this.selectionManager = selectionManager;
    this.gridScrollManager = gridScrollManager;
    this.callbacks = callbacks;

    this.currentState = this.createIdleState();
    this.isDisposed = false;

    this.currentState.enter(this);
  }

  handleMouseDown(event: MouseEvent): void {
    this.currentState.handleMouseDown(this, event);
  }

  handleMouseMove(event: MouseEvent): void {
    this.currentState.handleMouseMove(this, event);
  }

  handleMouseUp(): void {
    this.currentState.handleMouseUp(this);
  }

  handleDoubleClick(event: MouseEvent): void {
    this.currentState.handleDoubleClick(this, event);
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;

    this.resizeService.cancelResize();
    this.selectionManager.cancelSelection();

    this.changeState(
      new DisposedInteractionState()
    );
  }

  changeState(state: GridInteractionState): void {
    this.currentState.exit(this);
    this.currentState = state;
    this.currentState.enter(this);
  }

  createIdleState(): GridInteractionState {
    return new IdleInteractionState();
  }

  createSelectingState(): GridInteractionState {
    return new SelectingInteractionState();
  }

  createColumnResizeState(): GridInteractionState {
    return new ColumnResizeInteractionState();
  }

  createRowResizeState(): GridInteractionState {
    return new RowResizeInteractionState();
  }

  getMousePosition(event: MouseEvent): MousePosition {
    return CanvasUtils.getMousePosition(
      this.canvas,
      event
    );
  }

  getColumnResizeIndex(mouseX: number, mouseY: number): number | null {
    const { scrollX } =
      this.gridScrollManager.getScrollPosition();

    return this.coordinateService.getColumnResizeIndex(mouseX, mouseY, scrollX);
  }

  getRowResizeIndex(mouseX: number, mouseY: number): number | null {
    const { scrollY } =
      this.gridScrollManager.getScrollPosition();

    return this.coordinateService.getRowResizeIndex(mouseX, mouseY, scrollY);
  }

  commitCellEditor(): void {
    this.callbacks.commitCellEditor();
  }

  startColumnResize(columnIndex: number, mouseX: number): void {
    this.resizeService.startColumnResize(columnIndex, mouseX);
  }

  updateColumnResize(mouseX: number): void {
    this.resizeService.updateColumnResize(mouseX);
  }

  finishColumnResize(): void {
    this.resizeService.finishColumnResize();
  }

  startRowResize(rowIndex: number, mouseY: number): void {
    this.resizeService.startRowResize(rowIndex, mouseY);
  }

  updateRowResize(mouseY: number): void {
    this.resizeService.updateRowResize(mouseY);
  }

  finishRowResize(): void {
    this.resizeService.finishRowResize();
  }

  clearSelection(): void {
    this.selectionManager.cancelSelection();
    this.selectionService.clearSelection();
    this.statusBarService.reset();
    this.formulaBarService.clear();

    this.callbacks.render();
    this.gridScrollManager.updateScrollBars();
  }

  selectColumnFromHeader(mouseX: number): void {
    this.selectionManager.selectColumnFromHeader(mouseX);
  }

  selectRowFromHeader(mouseY: number): void {
    this.selectionManager.selectRowFromHeader(mouseY);
  }

  startRangeSelection(mouseX: number, mouseY: number): boolean {
    this.selectionManager.startRangeSelection(mouseX, mouseY);

    return this.selectionManager.isRangeSelectionActive();
  }

  updateRangeSelection(mouseX: number, mouseY: number): void {
    this.selectionManager.handleMouseMove(mouseX, mouseY);
  }

  finishRangeSelection(): void {
    this.selectionManager.handleMouseUp();
  }

  cancelSelection(): void {
    this.selectionManager.cancelSelection();
  }

  handleCellDoubleClick(mouseX: number, mouseY: number): void {
    const cellPosition = this.getCellPositionFromMouse(mouseX, mouseY);

    if (!cellPosition) {
      return;
    }

    this.selectionService.setCellSelection(cellPosition.rowIndex, cellPosition.columnIndex);

    this.callbacks.updateSelectionDependentUi();
    this.callbacks.render();

    const { scrollX, scrollY } = this.gridScrollManager.getScrollPosition();

    this.cellEditorService.show(
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      scrollX,
      scrollY
    );

    this.gridScrollManager.updateScrollBars();
  }

  updateResizeUi(): void {
    this.gridScrollManager.limitScrollPosition();
    this.callbacks.render();
    this.gridScrollManager.updateCellEditorPosition();
    this.gridScrollManager.updateScrollBars();
  }

  savePersistedState(): void {
    this.callbacks.savePersistedState();
  }

  setCursor(cursor: string): void {
    this.canvas.style.cursor = cursor;
  }

  isTopLeftCorner(mouseX: number, mouseY: number): boolean {
    return (mouseX < GridConfig.rowHeaderWidth && mouseY < GridConfig.columnHeaderHeight);
  }

  isColumnHeader(mouseX: number, mouseY: number): boolean {
    return (mouseX >= GridConfig.rowHeaderWidth && mouseY < GridConfig.columnHeaderHeight);
  }

  isRowHeader(mouseX: number, mouseY: number): boolean {
    return (mouseX < GridConfig.rowHeaderWidth && mouseY >= GridConfig.columnHeaderHeight);
  }

  private getColumnIndexFromMouseX(mouseX: number): number | null {
    const { scrollX } = this.gridScrollManager.getScrollPosition();

    return this.coordinateService.getColumnIndexFromMouseX(mouseX, scrollX);
  }

  private getRowIndexFromMouseY(mouseY: number): number | null {
    const { scrollY } = this.gridScrollManager.getScrollPosition();

    return this.coordinateService.getRowIndexFromMouseY(mouseY, scrollY);
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
}