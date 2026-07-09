import type { CommandManager } from "../commands/CommandManager";

interface UndoRedoManagerCallbacks {
  commitCellEditor(): void;
  savePersistedState(): void;
  limitScrollPosition(): void;
  render(): void;
  updateCellEditorPosition(): void;
  updateSelectionDependentUi(): void;
  updateScrollBars(): void;
}

export class UndoRedoManager {
  private commandManager: CommandManager;
  private callbacks: UndoRedoManagerCallbacks;

  constructor(
    commandManager: CommandManager,
    callbacks: UndoRedoManagerCallbacks
  ) {
    this.commandManager = commandManager;
    this.callbacks = callbacks;
  }

  undo(): void {
    this.callbacks.commitCellEditor();

    this.commandManager.undo();
    this.callbacks.savePersistedState();

    this.callbacks.limitScrollPosition();
    this.callbacks.render();
    this.callbacks.updateCellEditorPosition();

    this.callbacks.updateSelectionDependentUi();
    this.callbacks.updateScrollBars();
  }

  redo(): void {
    this.callbacks.commitCellEditor();

    this.commandManager.redo();
    this.callbacks.savePersistedState();

    this.callbacks.limitScrollPosition();
    this.callbacks.render();
    this.callbacks.updateCellEditorPosition();

    this.callbacks.updateSelectionDependentUi();
    this.callbacks.updateScrollBars();
  }
}