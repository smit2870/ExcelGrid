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
import { FormulaBarService } from "../services/FormulaBarService";

import { SelectionManager } from "../managers/SelectionManager";
import { ClipboardManager } from "../managers/ClipboardManager";
import { PersistenceManager } from "../managers/PersistenceManager";
import { CellEditingManager } from "../managers/CellEditingManager";
import { UndoRedoManager } from "../managers/UndoRedoManager";
import { KeyboardManager } from "../managers/KeyboardManager";
import { GridScrollManager } from "../managers/GridScrollManager";

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
  private formulaBarService: FormulaBarService;

  private gridScrollManager: GridScrollManager;
  private selectionManager: SelectionManager;
  private clipboardManager: ClipboardManager;
  private persistenceManager: PersistenceManager;
  private cellEditingManager: CellEditingManager;
  private undoRedoManager: UndoRedoManager;
  private keyboardManager: KeyboardManager;

  private mouseHandler: MouseHandler;
  private keyboardHandler: KeyboardHandler;

  private statusBar: HTMLElement | null;
  private cellEditor: HTMLTextAreaElement | null;
  private nameBox: HTMLInputElement | null;
  private formulaBar: HTMLTextAreaElement | null;

  private selectionUiUpdateTimer: number | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

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

    this.renderer = new GridRenderer(this.canvas, this.dataStore);

    this.gridScrollManager = new GridScrollManager(
      this.canvas,
      this.coordinateService,
      this.cellEditorService,
      {
        render: () => {
          this.render();
        }
      }
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
          this.gridScrollManager.limitScrollPosition();
        },
        render: () => {
          this.render();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        updateScrollBars: () => {
          this.gridScrollManager.updateScrollBars();
        }
      }
    );

    this.selectionManager = new SelectionManager(
      this.canvas,
      this.dataStore,
      this.selectionService,
      this.coordinateService,
      this.keyboardNavigationService,
      {
        getScrollPosition: () => {
          return this.gridScrollManager.getScrollPosition();
        },
        setScrollPosition: (scrollX: number, scrollY: number) => {
          this.gridScrollManager.setScrollPosition(scrollX, scrollY);
        },
        limitScrollPosition: () => {
          this.gridScrollManager.limitScrollPosition();
        },
        render: () => {
          this.render();
        },
        updateScrollBars: () => {
          this.gridScrollManager.updateScrollBars();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        scheduleSelectionDependentUiUpdate: () => {
          this.scheduleSelectionDependentUiUpdate();
        },
        flushSelectionDependentUiUpdate: () => {
          this.flushSelectionDependentUiUpdate();
        },
        updateCellEditorPosition: () => {
          this.gridScrollManager.updateCellEditorPosition();
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
          this.gridScrollManager.updateScrollBars();
        },
        updateCellEditorPosition: () => {
          this.gridScrollManager.updateCellEditorPosition();
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
          return this.gridScrollManager.getScrollPosition();
        },
        setScrollPosition: (scrollX: number, scrollY: number) => {
          this.gridScrollManager.setScrollPosition(scrollX, scrollY);
        },
        limitScrollPosition: () => {
          this.gridScrollManager.limitScrollPosition();
        },
        render: () => {
          this.render();
        },
        updateSelectionDependentUi: () => {
          this.updateSelectionDependentUi();
        },
        updateScrollBars: () => {
          this.gridScrollManager.updateScrollBars();
        },
        updateCellEditorPosition: () => {
          this.gridScrollManager.updateCellEditorPosition();
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
        this.gridScrollManager.limitScrollPosition();
      },
      render: () => {
        this.render();
      },
      updateCellEditorPosition: () => {
        this.gridScrollManager.updateCellEditorPosition();
      },
      updateSelectionDependentUi: () => {
        this.updateSelectionDependentUi();
      },
      updateScrollBars: () => {
        this.gridScrollManager.updateScrollBars();
      }
    });

    this.keyboardManager = new KeyboardManager(
      this.cellEditorService,
      this.clipboardManager,
      this.cellEditingManager,
      this.undoRedoManager,
      {
        selectAllData: () => {
          this.selectionManager.selectAllData();
        },
        clearSelectedCells: () => {
          this.clearSelectedCells();
        },
        moveSelectedCell: (rowDelta: number, columnDelta: number) => {
          this.moveSelectedCell(rowDelta, columnDelta);
        },
        extendSelectedRange: (rowDelta: number, columnDelta: number) => {
          this.extendSelectedRange(rowDelta, columnDelta);
        }
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

    this.initializeCanvas();
    this.loadData();
    void this.persistenceManager.loadPersistedState();
    this.attachEvents();

    this.render();
    this.gridScrollManager.updateScrollBars();

    this.formulaBarService.updateForSelection(
      this.selectionService.getSelection()
    );
  }

  private initializeCanvas(): void {
    this.resizeCanvas();

    window.addEventListener("resize", () => {
      this.resizeCanvas();
      this.gridScrollManager.limitScrollPosition();
      this.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
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
    this.gridScrollManager.attach();

    this.formulaBarService.attach({
      onFormulaCommit: (value: string) => {
        this.cellEditingManager.saveFormulaBarValue(value);
      },
      onNameBoxCommit: (value: string) => {
        this.selectionManager.navigateFromNameBox(value);
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
    this.gridScrollManager.handleWheel(event);
  }

  private async handleGlobalKeyDown(event: KeyboardEvent): Promise<void> {
    await this.keyboardManager.handleGlobalKeyDown(event);
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
      this.gridScrollManager.updateScrollBars();
      return;
    }

    const isColumnHeaderClick =
      mouseX >= GridConfig.rowHeaderWidth &&
      mouseY < GridConfig.columnHeaderHeight;

    if (isColumnHeaderClick) {
      this.commitCellEditor();
      this.selectionManager.selectColumnFromHeader(mouseX);
      return;
    }

    const isRowHeaderClick =
      mouseX < GridConfig.rowHeaderWidth &&
      mouseY >= GridConfig.columnHeaderHeight;

    if (isRowHeaderClick) {
      this.commitCellEditor();
      this.selectionManager.selectRowFromHeader(mouseY);
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
      this.gridScrollManager.limitScrollPosition();
      this.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.updateRowResize(mouseY);
      this.gridScrollManager.limitScrollPosition();
      this.render();
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
      this.gridScrollManager.limitScrollPosition();
      this.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.resizeService.isRowResizeActive()) {
      this.resizeService.finishRowResize();
      void this.persistenceManager.savePersistedState();

      this.canvas.style.cursor = "default";
      this.gridScrollManager.limitScrollPosition();
      this.render();
      this.gridScrollManager.updateCellEditorPosition();
      this.gridScrollManager.updateScrollBars();
      return;
    }

    if (this.selectionManager.handleMouseUp()) {
      return;
    }

    this.selectionManager.cancelSelection();
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

    const { scrollX, scrollY } = this.gridScrollManager.getScrollPosition();

    this.cellEditorService.show(
      cellPosition.rowIndex,
      cellPosition.columnIndex,
      scrollX,
      scrollY
    );

    this.gridScrollManager.updateScrollBars();
  }

  private moveSelectedCell(rowDelta: number, columnDelta: number): void {
    const currentScroll = this.gridScrollManager.getScrollPosition();

    const navigationResult = this.keyboardNavigationService.moveSelectedCell(
      rowDelta,
      columnDelta,
      currentScroll.scrollX,
      currentScroll.scrollY
    );

    this.gridScrollManager.setScrollPosition(
      navigationResult.scrollX,
      navigationResult.scrollY
    );

    this.gridScrollManager.limitScrollPosition();
    this.updateSelectionDependentUi();

    this.render();
    this.gridScrollManager.updateCellEditorPosition();
    this.gridScrollManager.updateScrollBars();
  }

  private extendSelectedRange(rowDelta: number, columnDelta: number): void {
    const currentScroll = this.gridScrollManager.getScrollPosition();

    const navigationResult = this.keyboardNavigationService.extendSelectedRange(
      rowDelta,
      columnDelta,
      currentScroll.scrollX,
      currentScroll.scrollY
    );

    this.gridScrollManager.setScrollPosition(
      navigationResult.scrollX,
      navigationResult.scrollY
    );

    this.gridScrollManager.limitScrollPosition();

    this.render();
    this.gridScrollManager.updateCellEditorPosition();
    this.gridScrollManager.updateScrollBars();

    this.scheduleSelectionDependentUiUpdate();
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
    this.gridScrollManager.updateScrollBars();
  }

  private commitCellEditor(): void {
    this.cellEditingManager.commitCellEditor();
  }

  private handleEditorKeyDown(event: KeyboardEvent): void {
    this.cellEditingManager.handleEditorKeyDown(event);
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

  private render(): void {
    const selection = this.selectionService.getSelection();
    const { scrollX, scrollY } = this.gridScrollManager.getScrollPosition();

    this.renderer.render(scrollX, scrollY, selection);
  }
}