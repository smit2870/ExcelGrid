import type { CellEditorService } from "../services/CellEditorService";
import type { ClipboardManager } from "./ClipboardManager";
import type { CellEditingManager } from "./CellEditingManager";
import type { UndoRedoManager } from "./UndoRedoManager";

interface KeyboardManagerCallbacks {
  selectAllData(): void;
  clearSelectedCells(): void;
  moveSelectedCell(rowDelta: number, columnDelta: number): void;
  extendSelectedRange(rowDelta: number, columnDelta: number): void;
}

export class KeyboardManager {
  private cellEditorService: CellEditorService;
  private clipboardManager: ClipboardManager;
  private cellEditingManager: CellEditingManager;
  private undoRedoManager: UndoRedoManager;
  private callbacks: KeyboardManagerCallbacks;

  constructor(
    cellEditorService: CellEditorService,
    clipboardManager: ClipboardManager,
    cellEditingManager: CellEditingManager,
    undoRedoManager: UndoRedoManager,
    callbacks: KeyboardManagerCallbacks
  ) {
    this.cellEditorService = cellEditorService;
    this.clipboardManager = clipboardManager;
    this.cellEditingManager = cellEditingManager;
    this.undoRedoManager = undoRedoManager;
    this.callbacks = callbacks;
  }

  async handleGlobalKeyDown(event: KeyboardEvent): Promise<void> {
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
      this.callbacks.selectAllData();
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
      this.callbacks.clearSelectedCells();
      return;
    }

    if (event.shiftKey && event.key === "ArrowRight") {
      event.preventDefault();
      this.callbacks.extendSelectedRange(0, 1);
      return;
    }

    if (event.shiftKey && event.key === "ArrowLeft") {
      event.preventDefault();
      this.callbacks.extendSelectedRange(0, -1);
      return;
    }

    if (event.shiftKey && event.key === "ArrowDown") {
      event.preventDefault();
      this.callbacks.extendSelectedRange(1, 0);
      return;
    }

    if (event.shiftKey && event.key === "ArrowUp") {
      event.preventDefault();
      this.callbacks.extendSelectedRange(-1, 0);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.callbacks.moveSelectedCell(0, 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.callbacks.moveSelectedCell(0, -1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.callbacks.moveSelectedCell(1, 0);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.callbacks.moveSelectedCell(-1, 0);
      return;
    }

    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      this.callbacks.moveSelectedCell(0, -1);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      this.callbacks.moveSelectedCell(0, 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      this.cellEditingManager.startEditingSelectedCell();
    }
  }
}