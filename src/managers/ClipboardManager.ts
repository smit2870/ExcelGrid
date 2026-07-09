import { GridConfig } from "../core/GridConfig";
import type { GridDataStore, CellValue } from "../core/GridDataStore";
import type { SelectionService } from "../services/SelectionService";
import { ClipboardService } from "../services/ClipboardService";
import type { CommandManager } from "../commands/CommandManager";
import { ClearCellsCommand } from "../commands/ClearCellsCommand";
import {
  PasteCellsCommand,
  type PastedCell
} from "../commands/PasteCellsCommand";

interface ClipboardManagerCallbacks {
  render(): void;
  updateSelectionDependentUi(): void;
  updateScrollBars(): void;
  updateCellEditorPosition(): void;
  savePersistedState(): void;
}

export class ClipboardManager {
  private dataStore: GridDataStore;
  private selectionService: SelectionService;
  private commandManager: CommandManager;
  private clipboardService: ClipboardService;
  private callbacks: ClipboardManagerCallbacks;

  constructor(
    dataStore: GridDataStore,
    selectionService: SelectionService,
    commandManager: CommandManager,
    callbacks: ClipboardManagerCallbacks
  ) {
    this.dataStore = dataStore;
    this.selectionService = selectionService;
    this.commandManager = commandManager;
    this.clipboardService = new ClipboardService();
    this.callbacks = callbacks;
  }

  async copySelectedCells(): Promise<void> {
    const selection = this.selectionService.getSelection();

    if (!selection) {
      return;
    }

    const clipboardText = this.clipboardService.copySelection(
      selection,
      this.dataStore
    );

    if (clipboardText === "") {
      return;
    }

    try {
      await navigator.clipboard.writeText(clipboardText);
    } catch (error) {
      console.error("Failed to copy selected cells.", error);
    }
  }

  async cutSelectedCells(): Promise<void> {
    const selection = this.selectionService.getSelection();

    if (!selection) {
      return;
    }

    const clipboardText = this.clipboardService.copySelection(
      selection,
      this.dataStore
    );

    try {
      await navigator.clipboard.writeText(clipboardText);
    } catch (error) {
      console.error("Failed to cut selected cells.", error);
      return;
    }

    this.clearSelectedCells();
  }

  async pasteCellsFromClipboard(): Promise<void> {
    const selection = this.selectionService.getSelection();

    if (!selection) {
      return;
    }

    let clipboardText = "";

    try {
      clipboardText = await navigator.clipboard.readText();
    } catch (error) {
      console.error("Failed to paste cells from clipboard.", error);
      return;
    }

    if (clipboardText.trim() === "") {
      return;
    }

    const parsedRows = this.clipboardService.parseClipboardText(clipboardText);

    const startRow = selection.startRow;
    const startColumn = selection.startColumn;

    const pastedCells: PastedCell[] = [];

    for (let rowOffset = 0; rowOffset < parsedRows.length; rowOffset++) {
      const row = parsedRows[rowOffset];

      for (let columnOffset = 0; columnOffset < row.length; columnOffset++) {
        const rowIndex = startRow + rowOffset;
        const columnIndex = startColumn + columnOffset;

        if (
          rowIndex >= GridConfig.totalRows ||
          columnIndex >= GridConfig.totalColumns
        ) {
          continue;
        }

        const oldValue = this.dataStore.getCellValue(rowIndex, columnIndex);

        const newValue = this.clipboardService.convertTextToCellValue(
          row[columnOffset]
        );

        pastedCells.push({
          rowIndex,
          columnIndex,
          oldValue,
          newValue
        });
      }
    }

    if (pastedCells.length === 0) {
      return;
    }

    const command = new PasteCellsCommand(this.dataStore, pastedCells);

    this.commandManager.execute(command);
    this.callbacks.savePersistedState();

    const pastedRowCount = parsedRows.length;
    const pastedColumnCount = Math.max(...parsedRows.map((row) => row.length));

    const endRow = Math.min(
      GridConfig.totalRows - 1,
      startRow + pastedRowCount - 1
    );

    const endColumn = Math.min(
      GridConfig.totalColumns - 1,
      startColumn + pastedColumnCount - 1
    );

    if (startRow === endRow && startColumn === endColumn) {
      this.selectionService.setCellSelection(startRow, startColumn);
    } else {
      this.selectionService.setRangeSelection(
        startRow,
        startColumn,
        endRow,
        endColumn
      );
    }

    this.callbacks.updateSelectionDependentUi();

    this.callbacks.render();
    this.callbacks.updateCellEditorPosition();
    this.callbacks.updateScrollBars();
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
    this.callbacks.savePersistedState();

    this.callbacks.render();
    this.callbacks.updateSelectionDependentUi();
    this.callbacks.updateScrollBars();
  }
}