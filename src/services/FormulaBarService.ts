import type { CellValue, GridDataStore } from "../core/GridDataStore";
import type { Selection } from "../models/Selection";
import { CanvasUtils } from "../utils/CanvasUtils";

interface FormulaBarCallbacks {
  onFormulaCommit(value: string): void;
  onNameBoxCommit(value: string): void;
}

export class FormulaBarService {
  private nameBox: HTMLInputElement | null;
  private formulaBar: HTMLTextAreaElement | null;
  private dataStore: GridDataStore;

  private callbacks: FormulaBarCallbacks | null;
  private isAttached: boolean;

  constructor(
    nameBox: HTMLInputElement | null,
    formulaBar: HTMLTextAreaElement | null,
    dataStore: GridDataStore
  ) {
    this.nameBox = nameBox;
    this.formulaBar = formulaBar;
    this.dataStore = dataStore;

    this.callbacks = null;
    this.isAttached = false;
  }

  attach(callbacks: FormulaBarCallbacks): void {
    this.callbacks = callbacks;

    if (this.isAttached) {
      return;
    }

    if (this.formulaBar) {
      this.formulaBar.addEventListener("keydown", this.handleFormulaBarKeyDown);
    }

    if (this.nameBox) {
      this.nameBox.addEventListener("keydown", this.handleNameBoxKeyDown);
    }

    this.isAttached = true;
  }

  detach(): void {
    if (!this.isAttached) {
      this.callbacks = null;
      return;
    }

    if (this.formulaBar) {
      this.formulaBar.removeEventListener("keydown", this.handleFormulaBarKeyDown);
    }

    if (this.nameBox) {
      this.nameBox.removeEventListener("keydown", this.handleNameBoxKeyDown);
    }

    this.callbacks = null;
    this.isAttached = false;
  }

  updateForSelection(selection: Selection | null): void {
    this.updateNameBox(selection);
    this.updateFormulaValue(selection);
  }

  getValue(): string {
    return this.formulaBar?.value ?? "";
  }

  setValue(value: CellValue): void {
    if (!this.formulaBar) {
      return;
    }

    this.formulaBar.value = value === null ? "" : String(value);
  }

  clear(): void {
    if (this.nameBox) {
      this.nameBox.value = "";
    }

    if (this.formulaBar) {
      this.formulaBar.value = "";
    }
  }

  private handleFormulaBarKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      this.insertNewLineAtCursor();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      const value = this.formulaBar?.value ?? "";
      this.callbacks?.onFormulaCommit(value);

      this.formulaBar?.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.formulaBar?.blur();
    }
  };

  private handleNameBoxKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") {
      event.preventDefault();

      const value = this.nameBox?.value ?? "";
      this.callbacks?.onNameBoxCommit(value);

      this.nameBox?.blur();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.nameBox?.blur();
    }
  };

  private updateNameBox(selection: Selection | null): void {
    if (!this.nameBox) {
      return;
    }

    if (!selection) {
      this.nameBox.value = "";
      return;
    }

    if (selection.type === "cell") {
      this.nameBox.value = this.getCellName(selection.startRow, selection.startColumn);
      return;
    }

    if (selection.type === "range") {
      const startRow = Math.min(selection.startRow, selection.endRow);

      const endRow = Math.max(selection.startRow, selection.endRow);

      const startColumn = Math.min(selection.startColumn, selection.endColumn);

      const endColumn = Math.max(selection.startColumn, selection.endColumn);

      const startCellName = this.getCellName(startRow, startColumn);

      const endCellName = this.getCellName(endRow, endColumn);

      this.nameBox.value = `${startCellName}:${endCellName}`;
      return;
    }

    if (selection.type === "row") {
      this.nameBox.value = `Row ${selection.startRow + 1}`;
      return;
    }

    if (selection.type === "column") {
      this.nameBox.value = `Column ${CanvasUtils.getColumnName(selection.startColumn)}`;
    }
  }

  private updateFormulaValue(selection: Selection | null): void {
    if (!this.formulaBar) {
      return;
    }

    if (!selection) {
      this.formulaBar.value = "";
      return;
    }

    const rowIndex = selection.startRow;
    const columnIndex = selection.startColumn;

    const rawValue = this.dataStore.getCellRawValue(rowIndex, columnIndex);

    this.formulaBar.value = rawValue === null ? "" : String(rawValue);
  }

  private insertNewLineAtCursor(): void {
    if (!this.formulaBar) {
      return;
    }

    const selectionStart = this.formulaBar.selectionStart;
    const selectionEnd = this.formulaBar.selectionEnd;
    const currentValue = this.formulaBar.value;

    this.formulaBar.value = currentValue.substring(0, selectionStart) + "\n" + currentValue.substring(selectionEnd);

    const newCursorPosition = selectionStart + 1;

    this.formulaBar.setSelectionRange(newCursorPosition, newCursorPosition);
  }

  private getCellName(rowIndex: number, columnIndex: number): string {
    const columnName = CanvasUtils.getColumnName(columnIndex);
    const rowNumber = rowIndex + 1;

    return `${columnName}${rowNumber}`;
  }
}