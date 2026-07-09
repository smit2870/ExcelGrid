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

interface MouseInteractionManagerCallbacks {
  commitCellEditor(): void;
  render(): void;
  updateSelectionDependentUi(): void;
  savePersistedState(): void;
}

export class MouseInteractionManager {
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
  }

  handleMouseDown(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const resizeColumnIndex = this.getColumnResizeIndex(mouseX, mouseY);

    if (resizeColumnIndex !== null) {
      this.callbacks.commitCellEditor();
      this.resizeService.startColumnResize(resizeColumnIndex, mouseX);
      this.canvas.style.cursor = "col-resize";
      return;
    }

    const resizeRowIndex = this.getRowResizeIndex(mouseX, mouseY);

    if (resizeRowIndex !== null) {
      this.callbacks.commitCellEditor();
      this.resizeService.startRowResize(resizeRowIndex, mouseY);
      this.canvas.style.cursor = "row-resize";
      return;
    }

    const isTopLeftCorner =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isTopLeftCorner) {
      this.callbacks.commitCellEditor();

      this.selectionManager.cancelSelection();
      this.selectionService.clearSelection();
      this.statusBarService.reset();
      this.formulaBarService.clear();

      this.callbacks.render();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    const isColumnHeaderClick =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isColumnHeaderClick) {
      this.callbacks.commitCellEditor();
      this.selectionManager.selectColumnFromHeader(mouseX);
      return;
    }

    const isRowHeaderClick =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (isRowHeaderClick) {
      this.callbacks.commitCellEditor();
      this.selectionManager.selectRowFromHeader(mouseY);
      return;
    }

    this.callbacks.commitCellEditor();
    this.selectionManager.startRangeSelection(mouseX, mouseY);
  }

  handleMouseMove(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    if (this.resizeService.isColumnResizeActive()) {
      this.resizeService.updateColumnResize(mouseX);
      this.gridScrollManager.limitScrollPosition();
      this.callbacks.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.updateRowResize(mouseY);
      this.gridScrollManager.limitScrollPosition();
      this.callbacks.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.selectionManager.handleMouseMove(mouseX, mouseY)) {
      return;
    }

    const resizeColumnIndex = this.getColumnResizeIndex(mouseX, mouseY);
    const resizeRowIndex = this.getRowResizeIndex(mouseX, mouseY);

    if (resizeColumnIndex !== null) {
      this.canvas.style.cursor = "col-resize";
      return;
    }

    if (resizeRowIndex !== null) {
      this.canvas.style.cursor = "row-resize";
      return;
    }

    this.canvas.style.cursor = "default";
  }

  handleMouseUp(): void {
    if (this.resizeService.isColumnResizeActive()) {
      this.resizeService.finishColumnResize();
      this.callbacks.savePersistedState();

      this.canvas.style.cursor = "default";

      this.gridScrollManager.limitScrollPosition();
      this.callbacks.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.finishRowResize();
      this.callbacks.savePersistedState();

      this.canvas.style.cursor = "default";

      this.gridScrollManager.limitScrollPosition();
      this.callbacks.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.selectionManager.handleMouseUp()) {
      return;
    }

    this.selectionManager.cancelSelection();
  }

  handleDoubleClick(event: MouseEvent): void {
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

  private getColumnResizeIndex(mouseX: number, mouseY: number): number | null {
    const { scrollX } = this.gridScrollManager.getScrollPosition();

    return this.coordinateService.getColumnResizeIndex(
      mouseX,
      mouseY,
      scrollX
    );
  }

  private getRowResizeIndex(mouseX: number, mouseY: number): number | null {
    const { scrollY } = this.gridScrollManager.getScrollPosition();

    return this.coordinateService.getRowResizeIndex(mouseX, mouseY, scrollY);
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