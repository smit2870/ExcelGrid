import type { CellValue, GridDataStore } from "../core/GridDataStore";
import type { SelectionService } from "../services/SelectionService";
import type { CellEditorService } from "../services/CellEditorService";
import type { KeyboardNavigationService } from "../services/KeyboardNavigationService";
import type { CommandManager } from "../commands/CommandManager";
import { EditCellCommand } from "../commands/EditCellCommand";

interface ScrollPosition {
  scrollX: number;
  scrollY: number;
}

interface CellEditingManagerCallbacks {
  getScrollPosition(): ScrollPosition;
  setScrollPosition(scrollX: number, scrollY: number): void;
  limitScrollPosition(): void;
  render(): void;
  updateSelectionDependentUi(): void;
  updateScrollBars(): void;
  updateCellEditorPosition(): void;
  savePersistedState(): void;
}

export class CellEditingManager {
  private dataStore: GridDataStore;
  private selectionService: SelectionService;
  private commandManager: CommandManager;
  private cellEditorService: CellEditorService;
  private keyboardNavigationService: KeyboardNavigationService;
  private callbacks: CellEditingManagerCallbacks;

  constructor(
    dataStore: GridDataStore,
    selectionService: SelectionService,
    commandManager: CommandManager,
    cellEditorService: CellEditorService,
    keyboardNavigationService: KeyboardNavigationService,
    callbacks: CellEditingManagerCallbacks
  ) {
    this.dataStore = dataStore;
    this.selectionService = selectionService;
    this.commandManager = commandManager;
    this.cellEditorService = cellEditorService;
    this.keyboardNavigationService = keyboardNavigationService;
    this.callbacks = callbacks;
  }

  commitCellEditor(): void {
    if (!this.cellEditorService.isEditing()) {
      return;
    }

    this.saveCellEditorValue();
  }

  startEditingSelectedCell(): void {
    const currentScroll = this.callbacks.getScrollPosition();

    const navigationResult =
      this.keyboardNavigationService.prepareSelectedCellForEditing(
        currentScroll.scrollX,
        currentScroll.scrollY
      );

    this.callbacks.setScrollPosition(
      navigationResult.scrollX,
      navigationResult.scrollY
    );

    this.callbacks.limitScrollPosition();
    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();

    const updatedScroll = this.callbacks.getScrollPosition();

    this.cellEditorService.show(
      navigationResult.rowIndex,
      navigationResult.columnIndex,
      updatedScroll.scrollX,
      updatedScroll.scrollY
    );

    this.callbacks.updateScrollBars();
  }

  saveFormulaBarValue(value: string): void {
    const selection = this.selectionService.getSelection();

    if (!selection) {
      return;
    }

    const rowIndex = selection.startRow;
    const columnIndex = selection.startColumn;

    const oldValue = this.dataStore.getCellValue(rowIndex, columnIndex);
    const newValue = this.parseCellValue(value);

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
      this.callbacks.savePersistedState();
    }

    this.selectionService.setCellSelection(rowIndex, columnIndex);

    this.callbacks.render();
    this.callbacks.updateSelectionDependentUi();
    this.callbacks.updateCellEditorPosition();
    this.callbacks.updateScrollBars();
  }

  handleEditorKeyDown(event: KeyboardEvent): void {
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
      this.callbacks.render();
      this.callbacks.updateScrollBars();
    }
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

    const newValue = this.parseCellValue(editorValue);

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
      this.callbacks.savePersistedState();
    }

    this.cellEditorService.hide();
    this.callbacks.render();

    this.callbacks.updateSelectionDependentUi();
    this.callbacks.updateScrollBars();
  }

  private parseCellValue(value: string): CellValue {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return null;
    }

    const numericValue = Number(trimmedValue);

    return Number.isNaN(numericValue) ? value : numericValue;
  }
}