import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { GridRenderer } from "./GridRenderer";

import { DataGenerator } from "../services/DataGenerator";
import { SelectionService } from "../services/SelectionService";
import { CoordinateService } from "../services/CoordinateService";
import { StatusBarService } from "../services/StatusBarService";
import { CellEditorService } from "../services/CellEditorService";
import { ResizeService } from "../services/ResizeService";
import { KeyboardNavigationService } from "../services/KeyboardNavigationService";
import { ScrollBarService } from "../services/ScrollBarService";
import { FormulaBarService } from "../services/FormulaBarService";

import { SelectionManager } from "../managers/SelectionManager";
import { ClipboardManager } from "../managers/ClipboardManager";
import { PersistenceManager } from "../managers/PersistenceManager";
import { CellEditingManager } from "../managers/CellEditingManager";
import { UndoRedoManager } from "../managers/UndoRedoManager";

import { CanvasUtils } from "../utils/CanvasUtils";

import { CommandManager } from "../commands/CommandManager";
import { ClearCellsCommand } from "../commands/ClearCellsCommand";

import { MouseHandler } from "../events/MouseHandler";
import { KeyboardHandler } from "../events/KeyboardHandler";

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
  private keyboardNavigationService: KeyboardNavigationService;
  private scrollBarService: ScrollBarService;
  private formulaBarService: FormulaBarService;

  private selectionManager: SelectionManager;
  private clipboardManager: ClipboardManager;
  private persistenceManager: PersistenceManager;
  private cellEditingManager: CellEditingManager;
  private undoRedoManager: UndoRedoManager;

  private mouseHandler: MouseHandler;
  private keyboardHandler: KeyboardHandler;

  private statusBar: HTMLElement | null;
  private cellEditor: HTMLTextAreaElement | null;
  private nameBox: HTMLInputElement | null;
  private formulaBar: HTMLTextAreaElement | null;

  private scrollX: number;
  private scrollY: number;

  private selectionUiUpdateTimer: number | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.scrollX = 0;
    this.scrollY = 0;

    this.selectionUiUpdateTimer = null;

    this.statusBar = document.getElementById("statusBar");

    this.cellEditor = document.getElementById(
      "cellEditor"
    ) as HTMLTextAreaElement | null;

    this.nameBox = document.getElementById(
      "nameBox"
    ) as HTMLInputElement | null;

    this.formulaBar = document.getElementById(
      "formulaBar"
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

    this.keyboardNavigationService = new KeyboardNavigationService(
      this.canvas,
      this.selectionService,
      this.coordinateService
    );

    this.formulaBarService = new FormulaBarService(
      this.nameBox,
      this.formulaBar,
      this.dataStore
    );

    this.persistenceManager = new PersistenceManager(
      this.dataStore,
      this.selectionService,
      this.statusBarService,
      this.formulaBarService,
      {
        commitCellEditor: () => {
          this.commitCellEditor();
        },
        limitScrollPosition: () => {
          this.limitScrollPosition();
        },
        render: () => {
          this.render();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        updateScrollBars: () => {
          this.updateScrollBars();
        }
      }
    );

    this.selectionManager = new SelectionManager(
      this.canvas,
      this.selectionService,
      this.coordinateService,
      {
        getScrollPosition: () => {
          return {
            scrollX: this.scrollX,
            scrollY: this.scrollY
          };
        },
        setScrollPosition: (scrollX: number, scrollY: number) => {
          this.scrollX = scrollX;
          this.scrollY = scrollY;
        },
        limitScrollPosition: () => {
          this.limitScrollPosition();
        },
        render: () => {
          this.render();
        },
        updateScrollBars: () => {
          this.updateScrollBars();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        scheduleSelectionDependentUiUpdate: () => {
          this.scheduleSelectionDependentUiUpdate();
        },
        flushSelectionDependentUiUpdate: () => {
          this.flushSelectionDependentUiUpdate();
        }
      }
    );

    this.clipboardManager = new ClipboardManager(
      this.dataStore,
      this.selectionService,
      this.commandManager,
      {
        render: () => {
          this.render();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        updateScrollBars: () => {
          this.updateScrollBars();
        },
        updateCellEditorPosition: () => {
          this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
        },
        savePersistedState: () => {
          void this.persistenceManager.savePersistedState();
        }
      }
    );

    this.cellEditingManager = new CellEditingManager(
      this.dataStore,
      this.selectionService,
      this.commandManager,
      this.cellEditorService,
      this.keyboardNavigationService,
      {
        getScrollPosition: () => {
          return {
            scrollX: this.scrollX,
            scrollY: this.scrollY
          };
        },
        setScrollPosition: (scrollX: number, scrollY: number) => {
          this.scrollX = scrollX;
          this.scrollY = scrollY;
        },
        limitScrollPosition: () => {
          this.limitScrollPosition();
        },
        render: () => {
          this.render();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        updateScrollBars: () => {
          this.updateScrollBars();
        },
        updateCellEditorPosition: () => {
          this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
        },
        savePersistedState: () => {
          void this.persistenceManager.savePersistedState();
        }
      }
    );

    this.undoRedoManager = new UndoRedoManager(this.commandManager, {
      commitCellEditor: () => {
        this.commitCellEditor();
      },
      savePersistedState: () => {
        void this.persistenceManager.savePersistedState();
      },
      limitScrollPosition: () => {
        this.limitScrollPosition();
      },
      render: () => {
        this.render();
      },
      updateCellEditorPosition: () => {
        this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      },
      updateSelectionDependentUi: () => {
        this.updateSelectionDependentUi();
      },
      updateScrollBars: () => {
        this.updateScrollBars();
      }
    });

    this.scrollBarService = new ScrollBarService(
      {
        horizontalTrack: document.getElementById("horizontalScrollbar"),
        horizontalThumb: document.getElementById("horizontalScrollThumb"),
        verticalTrack: document.getElementById("verticalScrollbar"),
        verticalThumb: document.getElementById("verticalScrollThumb")
      },
      (scrollX: number, scrollY: number) => {
        this.scrollX = scrollX;
        this.scrollY = scrollY;

        this.limitScrollPosition();
        this.render();
        this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
        this.updateScrollBars();
      }
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

    this.keyboardHandler = new KeyboardHandler(
      this.cellEditorService.getEditorElement(),
      {
        onGlobalKeyDown: (event: KeyboardEvent) => {
          this.handleGlobalKeyDown(event);
        },
        onEditorKeyDown: (event: KeyboardEvent) => {
          this.handleEditorKeyDown(event);
        }
      }
    );

    this.renderer = new GridRenderer(this.canvas, this.dataStore);

    this.initializeCanvas();
    this.loadData();
    void this.persistenceManager.loadPersistedState();
    this.attachEvents();

    this.render();
    this.updateScrollBars();

    this.formulaBarService.updateForSelection(
      this.selectionService.getSelection()
    );
  }

  private initializeCanvas(): void {
    this.resizeCanvas();

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      this.updateScrollBars();
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
    this.keyboardHandler.attach();
    this.scrollBarService.attach();

    this.formulaBarService.attach({
      onFormulaCommit: (value: string) => {
        this.cellEditingManager.saveFormulaBarValue(value);
      },
      onNameBoxCommit: (value: string) => {
        this.navigateFromNameBox(value);
      }
    });

    const undoButton = document.getElementById("undoBtn");
    const redoButton = document.getElementById("redoBtn");
    const clearSavedDataButton = document.getElementById("clearSavedDataBtn");
    const exportJsonButton = document.getElementById("exportJsonBtn");
    const importJsonButton = document.getElementById("importJsonBtn");
    const importJsonInput = document.getElementById(
      "importJsonInput"
    ) as HTMLInputElement | null;

    if (undoButton) {
      undoButton.addEventListener("click", () => {
        this.undoRedoManager.undo();
      });
    }

    if (redoButton) {
      redoButton.addEventListener("click", () => {
        this.undoRedoManager.redo();
      });
    }

    if (clearSavedDataButton) {
      clearSavedDataButton.addEventListener("click", async () => {
        await this.persistenceManager.clearSavedData();
      });
    }

    if (exportJsonButton) {
      exportJsonButton.addEventListener("click", () => {
        this.persistenceManager.exportGridData();
      });
    }

    if (importJsonButton && importJsonInput) {
      importJsonButton.addEventListener("click", () => {
        importJsonInput.click();
      });

      importJsonInput.addEventListener("change", async () => {
        const selectedFile = importJsonInput.files?.[0];

        if (!selectedFile) {
          return;
        }

        await this.persistenceManager.importGridData(selectedFile);
        importJsonInput.value = "";
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
    this.updateScrollBars();
  }

  private async handleGlobalKeyDown(event: KeyboardEvent): Promise<void> {
    const target = event.target as HTMLElement | null;
    const isFormulaBarFocused = target?.id === "formulaBar";
    const isNameBoxFocused = target?.id === "nameBox";

    const isUndo = event.ctrlKey && event.key.toLowerCase() === "z";
    const isRedo = event.ctrlKey && event.key.toLowerCase() === "y";
    const isCopy = event.ctrlKey && event.key.toLowerCase() === "c";
    const isCut = event.ctrlKey && event.key.toLowerCase() === "x";
    const isPaste = event.ctrlKey && event.key.toLowerCase() === "v";
    const isSelectAll = event.ctrlKey && event.key.toLowerCase() === "a";

    if (isFormulaBarFocused || isNameBoxFocused) {
      return;
    }

    if (isUndo) {
      event.preventDefault();
      this.undoRedoManager.undo();
      return;
    }

    if (isRedo) {
      event.preventDefault();
      this.undoRedoManager.redo();
      return;
    }

    if (this.cellEditorService.isEditing()) {
      return;
    }

    if (isSelectAll) {
      event.preventDefault();
      this.selectAllData();
      return;
    }

    if (isCopy) {
      event.preventDefault();
      await this.clipboardManager.copySelectedCells();
      return;
    }

    if (isCut) {
      event.preventDefault();
      await this.clipboardManager.cutSelectedCells();
      return;
    }

    if (isPaste) {
      event.preventDefault();
      await this.clipboardManager.pasteCellsFromClipboard();
      return;
    }

    if (event.key === "Delete") {
      event.preventDefault();
      this.clearSelectedCells();
      return;
    }

    if (event.shiftKey && event.key === "ArrowRight") {
      event.preventDefault();
      this.extendSelectedRange(0, 1);
      return;
    }

    if (event.shiftKey && event.key === "ArrowLeft") {
      event.preventDefault();
      this.extendSelectedRange(0, -1);
      return;
    }

    if (event.shiftKey && event.key === "ArrowDown") {
      event.preventDefault();
      this.extendSelectedRange(1, 0);
      return;
    }

    if (event.shiftKey && event.key === "ArrowUp") {
      event.preventDefault();
      this.extendSelectedRange(-1, 0);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.moveSelectedCell(0, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.moveSelectedCell(0, -1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.moveSelectedCell(1, 0);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.moveSelectedCell(-1, 0);
      return;
    }

    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      this.moveSelectedCell(0, -1);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      this.moveSelectedCell(0, 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.cellEditingManager.startEditingSelectedCell();
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
      this.formulaBarService.clear();
      this.render();
      this.updateScrollBars();
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
    this.selectionManager.startRangeSelection(mouseX, mouseY);
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
      this.updateScrollBars();
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.updateRowResize(mouseY);
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      this.updateScrollBars();
      return;
    }

    if (this.selectionManager.handleMouseMove(mouseX, mouseY)) {
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
  }

  private handleMouseUp(): void {
    if (this.resizeService.isColumnResizeActive()) {
      this.resizeService.finishColumnResize();
      void this.persistenceManager.savePersistedState();

      this.canvas.style.cursor = "default";
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      this.updateScrollBars();
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.finishRowResize();
      void this.persistenceManager.savePersistedState();

      this.canvas.style.cursor = "default";
      this.limitScrollPosition();
      this.render();
      this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
      this.updateScrollBars();
      return;
    }

    if (this.selectionManager.handleMouseUp()) {
      return;
    }

    this.selectionManager.cancelSelection();
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

    this.updateSelectionDependentUi();
    this.render();

    this.cellEditorService.show(
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      this.scrollX,
      this.scrollY
    );

    this.updateScrollBars();
  }

  private moveSelectedCell(rowDelta: number, columnDelta: number): void {
    const navigationResult = this.keyboardNavigationService.moveSelectedCell(
      rowDelta,
      columnDelta,
      this.scrollX,
      this.scrollY
    );

    this.scrollX = navigationResult.scrollX;
    this.scrollY = navigationResult.scrollY;

    this.limitScrollPosition();
    this.updateSelectionDependentUi();

    this.render();
    this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
    this.updateScrollBars();
  }

  private extendSelectedRange(rowDelta: number, columnDelta: number): void {
    const navigationResult = this.keyboardNavigationService.extendSelectedRange(
      rowDelta,
      columnDelta,
      this.scrollX,
      this.scrollY
    );

    this.scrollX = navigationResult.scrollX;
    this.scrollY = navigationResult.scrollY;

    this.limitScrollPosition();

    this.render();
    this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
    this.updateScrollBars();

    this.scheduleSelectionDependentUiUpdate();
  }

  private selectAllData(): void {
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

    this.updateSelectionDependentUi();

    this.render();
    this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
    this.updateScrollBars();
  }

  private clearSelectedCells(): void {
    const selection = this.selectionService.getSelection();

    if (!selection) {
      return;
    }

    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startColumn = Math.min(selection.startColumn, selection.endColumn);
    const endColumn = Math.max(selection.startColumn, selection.endColumn);

    const cellsToClear: Array<{
      rowIndex: number;
      columnIndex: number;
      oldValue: CellValue;
    }> = [];

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      for (
        let columnIndex = startColumn;
        columnIndex <= endColumn;
        columnIndex++
      ) {
        const oldValue = this.dataStore.getCellValue(rowIndex, columnIndex);

        if (oldValue === null) {
          continue;
        }

        cellsToClear.push({
          rowIndex,
          columnIndex,
          oldValue
        });
      }
    }

    if (cellsToClear.length === 0) {
      return;
    }

    const command = new ClearCellsCommand(this.dataStore, cellsToClear);

    this.commandManager.execute(command);
    void this.persistenceManager.savePersistedState();

    this.render();

    this.updateSelectionDependentUi();
    this.updateScrollBars();
  }

  private navigateFromNameBox(value: string): void {
    const parsedReference = this.parseNameBoxReference(value);

    if (!parsedReference) {
      this.formulaBarService.updateForSelection(
        this.selectionService.getSelection()
      );
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

    this.updateSelectionDependentUi();

    this.render();
    this.cellEditorService.updatePosition(this.scrollX, this.scrollY);
    this.updateScrollBars();
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
    const updatedScroll = this.keyboardNavigationService.ensureCellVisible(
      rowIndex,
      columnIndex,
      this.scrollX,
      this.scrollY
    );

    this.scrollX = updatedScroll.scrollX;
    this.scrollY = updatedScroll.scrollY;

    this.limitScrollPosition();
  }

  private commitCellEditor(): void {
    this.cellEditingManager.commitCellEditor();
  }

  private handleEditorKeyDown(event: KeyboardEvent): void {
    this.cellEditingManager.handleEditorKeyDown(event);
  }

  private handleRowHeaderClick(mouseY: number): void {
    const rowIndex = this.getRowIndexFromMouseY(mouseY);

    if (rowIndex === null) {
      return;
    }

    this.selectionManager.cancelSelection();

    this.selectionService.setRowSelection(rowIndex);

    this.updateSelectionDependentUi();

    this.render();
    this.updateScrollBars();
  }

  private handleColumnHeaderClick(mouseX: number): void {
    const columnIndex = this.getColumnIndexFromMouseX(mouseX);

    if (columnIndex === null) {
      return;
    }

    this.selectionManager.cancelSelection();

    this.selectionService.setColumnSelection(columnIndex);

    this.updateSelectionDependentUi();

    this.render();
    this.updateScrollBars();
  }

  private scheduleSelectionDependentUiUpdate(): void {
    if (this.selectionUiUpdateTimer !== null) {
      window.clearTimeout(this.selectionUiUpdateTimer);
    }

    this.selectionUiUpdateTimer = window.setTimeout(() => {
      this.updateSelectionDependentUi();
      this.selectionUiUpdateTimer = null;
    }, 20);
  }

  private flushSelectionDependentUiUpdate(): void {
    if (this.selectionUiUpdateTimer !== null) {
      window.clearTimeout(this.selectionUiUpdateTimer);
      this.selectionUiUpdateTimer = null;
    }

    this.updateSelectionDependentUi();
  }

  private updateSelectionDependentUi(): void {
    const selection = this.selectionService.getSelection();

    this.statusBarService.updateForSelection(selection);
    this.formulaBarService.updateForSelection(selection);
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

  private updateScrollBars(): void {
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

    this.scrollBarService.update({
      scrollX: this.scrollX,
      scrollY: this.scrollY,
      maxScrollX,
      maxScrollY,
      viewportWidth: this.canvas.clientWidth,
      viewportHeight: this.canvas.clientHeight
    });
  }

  private render(): void {
    const selection = this.selectionService.getSelection();

    this.renderer.render(this.scrollX, this.scrollY, selection);
  }
}