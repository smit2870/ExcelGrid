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

  constructor(
    nameBox: HTMLInputElement | null,
    formulaBar: HTMLTextAreaElement | null,
    dataStore: GridDataStore
  ) {
    this.nameBox = nameBox;
    this.formulaBar = formulaBar;
    this.dataStore = dataStore;
  }

  attach(callbacks: FormulaBarCallbacks): void {
    if (this.formulaBar) {
      this.formulaBar.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter" && event.altKey) {
          event.preventDefault();
          this.insertNewLineAtCursor();
          return;
        }

        if (event.key === "Enter") {
          event.preventDefault();

          const value = this.formulaBar?.value ?? "";
          callbacks.onFormulaCommit(value);

          this.formulaBar?.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          this.formulaBar?.blur();
        }
      });
    }

    if (this.nameBox) {
      this.nameBox.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter") {
          event.preventDefault();

          const value = this.nameBox?.value ?? "";
          callbacks.onNameBoxCommit(value);

          this.nameBox?.blur();
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          this.nameBox?.blur();
        }
      });
    }
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

  private updateNameBox(selection: Selection | null): void {
    if (!this.nameBox) {
      return;
    }

    if (!selection) {
      this.nameBox.value = "";
      return;
    }

    if (selection.type === "cell") {
      this.nameBox.value = this.getCellName(
        selection.startRow,
        selection.startColumn
      );
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
      this.nameBox.value = `Column ${CanvasUtils.getColumnName(
        selection.startColumn
      )}`;
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

    this.formulaBar.value =
      currentValue.substring(0, selectionStart) +
      "\n" +
      currentValue.substring(selectionEnd);

    const newCursorPosition = selectionStart + 1;
    this.formulaBar.setSelectionRange(newCursorPosition, newCursorPosition);
  }

  private getCellName(rowIndex: number, columnIndex: number): string {
    const columnName = CanvasUtils.getColumnName(columnIndex);
    const rowNumber = rowIndex + 1;

    return `${columnName}${rowNumber}`;
  }
}