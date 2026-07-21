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
import { MouseInteractionManager } from "../managers/MouseInteractionManager";

import { CommandManager } from "../commands/CommandManager";

import { MouseHandler } from "../events/MouseHandler";
import { KeyboardHandler } from "../events/KeyboardHandler";

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
  private mouseInteractionManager: MouseInteractionManager;

  private mouseHandler: MouseHandler;
  private keyboardHandler: KeyboardHandler;

  private statusBar: HTMLElement | null;
  private cellEditor: HTMLTextAreaElement | null;
  private nameBox: HTMLInputElement | null;
  private formulaBar: HTMLTextAreaElement | null;

  private undoButton: HTMLElement | null;
  private redoButton: HTMLElement | null;
  private clearSavedDataButton: HTMLElement | null;
  private exportJsonButton: HTMLElement | null;
  private importJsonButton: HTMLElement | null;
  private importJsonInput: HTMLInputElement | null;

  private selectionUiUpdateTimer: number | null;
  private navigationRenderFrameId: number | null;

  private isDisposed: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.selectionUiUpdateTimer = null;
    this.navigationRenderFrameId = null;

    this.isDisposed = false;

    this.statusBar = document.getElementById("statusBar");

    this.cellEditor = document.getElementById("cellEditor") as HTMLTextAreaElement | null;

    this.nameBox = document.getElementById("nameBox") as HTMLInputElement | null;

    this.formulaBar = document.getElementById("formulaBar") as HTMLTextAreaElement | null;

    this.undoButton = document.getElementById("undoBtn");
    this.redoButton = document.getElementById("redoBtn");

    this.clearSavedDataButton = document.getElementById("clearSavedDataBtn");

    this.exportJsonButton = document.getElementById("exportJsonBtn");

    this.importJsonButton = document.getElementById("importJsonBtn");

    this.importJsonInput = document.getElementById("importJsonInput") as HTMLInputElement | null;

    this.dataStore = new GridDataStore(GridConfig.defaultRowHeight, GridConfig.defaultColumnWidth);

    this.selectionService = new SelectionService();
    this.commandManager = new CommandManager();

    this.coordinateService = new CoordinateService(this.canvas, this.dataStore);

    this.statusBarService = new StatusBarService(this.statusBar, this.dataStore);

    this.cellEditorService = new CellEditorService(this.canvas, this.dataStore, this.coordinateService, this.cellEditor);

    this.resizeService = new ResizeService(this.dataStore, this.commandManager);

    this.keyboardNavigationService = new KeyboardNavigationService(this.canvas, this.selectionService, this.coordinateService);

    this.formulaBarService = new FormulaBarService(this.nameBox, this.formulaBar, this.dataStore);

    this.renderer = new GridRenderer(this.canvas, this.dataStore);

    this.gridScrollManager = new GridScrollManager(this.canvas, this.coordinateService, this.cellEditorService, {
      render: () => {
        this.render();
      }
    }
    );

    this.persistenceManager = new PersistenceManager(this.dataStore, this.selectionService, this.statusBarService, this.formulaBarService, {
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
        setScrollPosition: (
          scrollX: number,
          scrollY: number
        ) => {
          this.gridScrollManager.setScrollPosition(
            scrollX,
            scrollY
          );
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
        setScrollPosition: (
          scrollX: number,
          scrollY: number
        ) => {
          this.gridScrollManager.setScrollPosition(
            scrollX,
            scrollY
          );
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

    this.undoRedoManager = new UndoRedoManager(
      this.commandManager,
      {
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
      }
    );

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
          this.clipboardManager.clearSelectedCells();
        },
        moveSelectedCell: (rowDelta: number, columnDelta: number) => {
          this.moveSelectedCell(rowDelta, columnDelta);
        },
        extendSelectedRange: (rowDelta: number, columnDelta: number) => {
          this.extendSelectedRange(rowDelta, columnDelta);
        }
      }
    );

    this.mouseInteractionManager =
      new MouseInteractionManager(
        this.canvas,
        this.coordinateService,
        this.resizeService,
        this.selectionService,
        this.cellEditorService,
        this.statusBarService,
        this.formulaBarService,
        this.selectionManager,
        this.gridScrollManager,
        {
          commitCellEditor: () => {
            this.commitCellEditor();
          },
          render: () => {
            this.render();
          },
          updateSelectionDependentUi: () => {
            this.updateSelectionDependentUi();
          },
          savePersistedState: () => {
            void this.persistenceManager.savePersistedState();
          }
        }
      );

    this.mouseHandler = new MouseHandler(
      this.canvas,
      {
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
      }
    );

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

    this.formulaBarService.updateForSelection(this.selectionService.getSelection());
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    window.removeEventListener("resize", this.handleWindowResize);

    this.mouseHandler.detach();
    this.keyboardHandler.detach();

    this.mouseInteractionManager.dispose();
    this.formulaBarService.detach();
    this.gridScrollManager.dispose();
    this.selectionManager.dispose();

    this.detachToolbarEvents();

    if (this.selectionUiUpdateTimer !== null) {
      window.clearTimeout(this.selectionUiUpdateTimer);

      this.selectionUiUpdateTimer = null;
    }

    if (this.navigationRenderFrameId !== null) {
      window.cancelAnimationFrame(this.navigationRenderFrameId);
      this.navigationRenderFrameId = null;
    }
  }

  private initializeCanvas(): void {
    this.resizeCanvas();
    window.addEventListener("resize", this.handleWindowResize);
  }

  private handleWindowResize = (): void => {
    this.resizeCanvas();
    this.gridScrollManager.limitScrollPosition();
    this.render();
    this.gridScrollManager.updateCellEditorPosition();
    this.gridScrollManager.updateScrollBars();
  };

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

    if (this.undoButton) {
      this.undoButton.addEventListener("click", this.handleUndoClick);
    }

    if (this.redoButton) {
      this.redoButton.addEventListener("click", this.handleRedoClick);
    }

    if (this.clearSavedDataButton) {
      this.clearSavedDataButton.addEventListener("click", this.handleClearSavedDataClick);
    }

    if (this.exportJsonButton) {
      this.exportJsonButton.addEventListener("click", this.handleExportJsonClick);
    }

    if (this.importJsonButton && this.importJsonInput) {
      this.importJsonButton.addEventListener("click", this.handleImportJsonClick);

      this.importJsonInput.addEventListener("change", this.handleImportJsonChange);
    }
  }

  private detachToolbarEvents(): void {
    if (this.undoButton) {
      this.undoButton.removeEventListener("click", this.handleUndoClick);
    }

    if (this.redoButton) {
      this.redoButton.removeEventListener("click", this.handleRedoClick);
    }

    if (this.clearSavedDataButton) {
      this.clearSavedDataButton.removeEventListener("click", this.handleClearSavedDataClick);
    }

    if (this.exportJsonButton) {
      this.exportJsonButton.removeEventListener("click", this.handleExportJsonClick);
    }

    if (this.importJsonButton && this.importJsonInput) {
      this.importJsonButton.removeEventListener("click", this.handleImportJsonClick);

      this.importJsonInput.removeEventListener("change", this.handleImportJsonChange);
    }
  }

  private handleUndoClick = (): void => {
    this.undoRedoManager.undo();
  };

  private handleRedoClick = (): void => {
    this.undoRedoManager.redo();
  };

  private handleClearSavedDataClick = async (): Promise<void> => {
    await this.persistenceManager.clearSavedData();
  };

  private handleExportJsonClick = (): void => {
    this.persistenceManager.exportGridData();
  };

  private handleImportJsonClick = (): void => {
    this.importJsonInput?.click();
  };

  private handleImportJsonChange =
    async (): Promise<void> => {
      const selectedFile = this.importJsonInput?.files?.[0];

      if (!selectedFile) {
        return;
      }

      await this.persistenceManager.importGridData(selectedFile);

      if (this.importJsonInput) {
        this.importJsonInput.value = "";
      }
    };

  private handleWheel(event: WheelEvent): void {
    this.gridScrollManager.handleWheel(event);
  }

  private async handleGlobalKeyDown(event: KeyboardEvent): Promise<void> {
    await this.keyboardManager.handleGlobalKeyDown(event);
  }

  private handleMouseDown(event: MouseEvent): void {
    this.mouseInteractionManager.handleMouseDown(event);
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouseInteractionManager.handleMouseMove(event);
  }

  private handleMouseUp(): void {
    this.mouseInteractionManager.handleMouseUp();
  }

  private handleDoubleClick(event: MouseEvent): void {
    this.mouseInteractionManager.handleDoubleClick(event);
  }

  private moveSelectedCell(rowDelta: number, columnDelta: number): void {
    const currentScroll = this.gridScrollManager.getScrollPosition();

    const navigationResult = this.keyboardNavigationService
      .moveSelectedCell(rowDelta, columnDelta, currentScroll.scrollX, currentScroll.scrollY);

    this.gridScrollManager.setScrollPosition(navigationResult.scrollX, navigationResult.scrollY);

    this.gridScrollManager.limitScrollPosition();

    this.scheduleSelectionDependentUiUpdate();
    this.scheduleNavigationRender();
  }

  private extendSelectedRange(rowDelta: number, columnDelta: number): void {
    const currentScroll = this.gridScrollManager.getScrollPosition();

    const navigationResult = this.keyboardNavigationService
      .extendSelectedRange(rowDelta, columnDelta, currentScroll.scrollX, currentScroll.scrollY);

    this.gridScrollManager.setScrollPosition(navigationResult.scrollX, navigationResult.scrollY);
    this.gridScrollManager.limitScrollPosition();
    this.scheduleSelectionDependentUiUpdate();
    this.scheduleNavigationRender();
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

  private scheduleNavigationRender(): void {
    if (this.navigationRenderFrameId !== null) {
      return;
    }

    this.navigationRenderFrameId =
      window.requestAnimationFrame(() => {
        this.navigationRenderFrameId = null;

        this.render();

        this.gridScrollManager.updateCellEditorPosition();

        this.gridScrollManager.updateScrollBars();
      });
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