import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { GridRenderer } from "./GridRenderer";

import { DataGenerator } from "../services/DataGenerator";
import { SelectionService } from "../services/SelectionService";
import { CoordinateService } from "../services/CoordinateService";
import { StatusBarService } from "../services/StatusBarService";
import { CellEditorService } from "../services/CellEditorService";
import { ResizeService } from "../services/ResizeService";

import { CanvasUtils } from "../utils/CanvasUtils";

import { CommandManager } from "../commands/CommandManager";
import { EditCellCommand } from "../commands/EditCellCommand";

import { MouseHandler } from "../events/MouseHandler";

import type { CellValue } from "./GridDataStore";

export class Grid {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private renderer: GridRenderer;

  private selectionService: SelectionService;
  private commandManager: CommandManager;
  private coordinateService: CoordinateService;
  private statusBarService: StatusBarService;
  private cellEditorService: CellEditorService;
  private resizeService: ResizeService;
  private mouseHandler: MouseHandler;

  private statusBar: HTMLElement | null;
  private cellEditor: HTMLTextAreaElement | null;

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
    this.cellEditor = document.getElementById(
      "cellEditor"
    ) as HTMLTextAreaElement | null;

    this.dataStore = new GridDataStore(
      GridConfig.defaultRowHeight,
      GridConfig.defaultColumnWidth
    );

    this.selectionService = new SelectionService();
    this.commandManager = new CommandManager();

    this.coordinateService = new CoordinateService(
      this.canvas,
      this.dataStore
    );

    this.statusBarService = new StatusBarService(
      this.statusBar,
      this.dataStore
    );

    this.cellEditorService = new CellEditorService(
      this.canvas,
      this.dataStore,
      this.coordinateService,
      this.cellEditor
    );

    this.resizeService = new ResizeService(
      this.dataStore,
      this.commandManager
    );

    this.mouseHandler = new MouseHandler(this.canvas, {
      onWheel: (event: WheelEvent) => {
        this.handleWheel(event);
      },
      onMouseDown: (event: MouseEvent) => {
        this.handleMouseDown(event);
      },
      onMouseMove: (event: MouseEvent) => {
        this.handleMouseMove(event);
      },
      onDoubleClick: (event: MouseEvent) => {
        this.handleDoubleClick(event);
      },
      onMouseUp: () => {
        this.handleMouseUp();
      }
    });

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
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
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
    this.mouseHandler.attach();

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
        this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
        this.statusBarService.updateForSelection(
          this.selectionService.getSelection()
        );
      });
    }

    if (redoButton) {
      redoButton.addEventListener("click", () => {
        this.commitCellEditor();
        this.commandManager.redo();
        this.limitScrollPosition();
        this.render();
        this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
        this.statusBarService.updateForSelection(
          this.selectionService.getSelection()
        );
      });
    }

    const editorElement = this.cellEditorService.getEditorElement();

    if (editorElement) {
      editorElement.addEventListener("keydown", (event: KeyboardEvent) => {
        this.handleEditorKeyDown(event);
      });
    }
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    this.scrollX += event.deltaX;
    this.scrollY += event.deltaY;

    this.limitScrollPosition();
    this.render();
    this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
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
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      this.statusBarService.updateForSelection(
        this.selectionService.getSelection()
      );
      return;
    }

    if (isRedo) {
      event.preventDefault();

      this.commitCellEditor();
      this.commandManager.redo();
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      this.statusBarService.updateForSelection(
        this.selectionService.getSelection()
      );
    }
  }

  private handleMouseDown(event: MouseEvent): void {
    const mousePosition = CanvasUtils.getMousePosition(this.canvas, event);

    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const resizeColumnIndex = this.getColumnResizeIndex(mouseX, mouseY);

    if (resizeColumnIndex !== null) {
      this.commitCellEditor();
      this.resizeService.startColumnResize(resizeColumnIndex, mouseX);
      this.canvas.style.cursor = "col-resize";
      return;
    }

    const resizeRowIndex = this.getRowResizeIndex(mouseX, mouseY);

    if (resizeRowIndex !== null) {
      this.commitCellEditor();
      this.resizeService.startRowResize(resizeRowIndex, mouseY);
      this.canvas.style.cursor = "row-resize";
      return;
    }

    const isTopLeftCorner =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isTopLeftCorner) {
      this.commitCellEditor();
      this.selectionService.clearSelection();
      this.statusBarService.reset();
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

    if (this.resizeService.isColumnResizeActive()) {
      this.resizeService.updateColumnResize(mouseX);
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.updateRowResize(mouseY);
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
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

    this.statusBarService.updateRange(
      this.rangeStartRow,
      this.rangeStartColumn,
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      this.selectionService.getSelection()
    );

    this.render();
  }

  private handleMouseUp(): void {
    if (this.resizeService.isColumnResizeActive()) {
      this.resizeService.finishColumnResize();
      this.canvas.style.cursor = "default";
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.finishRowResize();
      this.canvas.style.cursor = "default";
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      return;
    }

    this.isSelectingRange = false;
  }

  private getColumnResizeIndex(mouseX: number, mouseY: number): number | null {
    return this.coordinateService.getColumnResizeIndex(
      mouseX,
      mouseY,
      this.scrollX
    );
  }

  private getRowResizeIndex(mouseX: number, mouseY: number): number | null {
    return this.coordinateService.getRowResizeIndex(
      mouseX,
      mouseY,
      this.scrollY
    );
  }

  private getColumnIndexFromMouseX(mouseX: number): number | null {
    return this.coordinateService.getColumnIndexFromMouseX(
      mouseX,
      this.scrollX
    );
  }

  private getRowIndexFromMouseY(mouseY: number): number | null {
    return this.coordinateService.getRowIndexFromMouseY(mouseY, this.scrollY);
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

    this.statusBarService.updateCell(
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      this.selectionService.getSelection()
    );

    this.render();

    this.cellEditorService.show(
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      this.scrollX,
      this.scrollY
    );
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

    this.statusBarService.updateCell(
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      this.selectionService.getSelection()
    );

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

  private commitCellEditor(): void {
    if (!this.cellEditorService.isEditing()) {
      return;
    }

    this.saveCellEditorValue();
  }

  private saveCellEditorValue(): void {
    const editingCell = this.cellEditorService.getEditingCell();

    if (!editingCell) {
      return;
    }

    const rowIndex = editingCell.rowIndex;
    const columnIndex = editingCell.columnIndex;

    const oldValue = this.dataStore.getCellValue(rowIndex, columnIndex);
    const editorValue = this.cellEditorService.getValue().trim();

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

    this.cellEditorService.hide();
    this.render();

    this.statusBarService.updateForSelection(
      this.selectionService.getSelection()
    );
  }

  private handleEditorKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      this.cellEditorService.insertNewLineAtCursor();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.saveCellEditorValue();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.cellEditorService.hide();
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

    this.statusBarService.updateRow(
      rowIndex,
      this.selectionService.getSelection()
    );

    this.render();
  }

  private handleColumnHeaderClick(mouseX: number): void {
    const columnIndex = this.getColumnIndexFromMouseX(mouseX);

    if (columnIndex === null) {
      return;
    }

    this.isSelectingRange = false;
    this.selectionService.setColumnSelection(columnIndex);

    this.statusBarService.updateColumn(
      columnIndex,
      this.selectionService.getSelection()
    );

    this.render();
  }

  private getTotalColumnsWidth(): number {
    return this.coordinateService.getTotalColumnsWidth();
  }

  private getTotalRowsHeight(): number {
    return this.coordinateService.getTotalRowsHeight();
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