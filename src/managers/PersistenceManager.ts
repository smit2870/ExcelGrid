import type { GridDataStore } from "../core/GridDataStore";
import type { SelectionService } from "../services/SelectionService";
import type { StatusBarService } from "../services/StatusBarService";
import type { FormulaBarService } from "../services/FormulaBarService";

import {
  PersistenceService,
  type GridPersistenceState
} from "../services/PersistenceService";

import { ImportExportService } from "../services/ImportExportService";

interface PersistenceManagerCallbacks {
  commitCellEditor(): void;
  limitScrollPosition(): void;
  render(): void;
  updateSelectionDependentUi(): void;
  updateScrollBars(): void;
}

export class PersistenceManager {
  private dataStore: GridDataStore;
  private selectionService: SelectionService;
  private statusBarService: StatusBarService;
  private formulaBarService: FormulaBarService;

  private persistenceService: PersistenceService;
  private importExportService: ImportExportService;

  private callbacks: PersistenceManagerCallbacks;

  constructor(
    dataStore: GridDataStore,
    selectionService: SelectionService,
    statusBarService: StatusBarService,
    formulaBarService: FormulaBarService,
    callbacks: PersistenceManagerCallbacks
  ) {
    this.dataStore = dataStore;
    this.selectionService = selectionService;
    this.statusBarService = statusBarService;
    this.formulaBarService = formulaBarService;

    this.persistenceService = new PersistenceService();
    this.importExportService = new ImportExportService();

    this.callbacks = callbacks;
  }

  async loadPersistedState(): Promise<void> {
    const persistedState = await this.persistenceService.load();

    if (!persistedState) {
      return;
    }

    this.applyPersistenceState(persistedState);
  }

  async savePersistedState(): Promise<void> {
    await this.persistenceService.save(this.getPersistenceState());
  }

  async clearSavedData(): Promise<void> {
    await this.persistenceService.clear();
    window.location.reload();
  }

  exportGridData(): void {
    this.callbacks.commitCellEditor();

    const state = this.getPersistenceState();
    this.importExportService.exportState(state);
  }

  async importGridData(file: File): Promise<void> {
    this.callbacks.commitCellEditor();

    const importedState = await this.importExportService.importState(file);

    if (!importedState) {
      return;
    }

    this.applyPersistenceState(importedState);
    await this.savePersistedState();

    this.selectionService.clearSelection();
    this.statusBarService.reset();
    this.formulaBarService.clear();

    this.callbacks.render();
    this.callbacks.updateScrollBars();
  }

  private getPersistenceState(): GridPersistenceState {
    return {
      cells: this.dataStore.getSerializableCells(),
      rowHeights: this.dataStore.getSerializableRowHeights(),
      columnWidths: this.dataStore.getSerializableColumnWidths()
    };
  }

  private applyPersistenceState(state: GridPersistenceState): void {
    this.dataStore.loadSerializedCells(state.cells);
    this.dataStore.loadSerializedRowHeights(state.rowHeights);
    this.dataStore.loadSerializedColumnWidths(state.columnWidths);

    this.callbacks.limitScrollPosition();
    this.callbacks.render();
    this.callbacks.updateSelectionDependentUi();
    this.callbacks.updateScrollBars();
  }
}