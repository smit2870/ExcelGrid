import type { GridDataStore, CellValue } from "../core/GridDataStore";
import type { Selection } from "../models/Selection";

export class StatusBarService {
  private statusBar: HTMLElement | null;
  private dataStore: GridDataStore;

  constructor(statusBar: HTMLElement | null, dataStore: GridDataStore) {
    this.statusBar = statusBar;
    this.dataStore = dataStore;
  }

  reset(): void {
    if (!this.statusBar) {
      return;
    }

    this.statusBar.textContent = "Count: 0 | Sum: 0 | Avg: - | Min: - | Max: -";
  }

  updateForSelection(selection: Selection | null): void {
    if (!this.statusBar) {
      return;
    }

    if (!selection) {
      this.reset();
      return;
    }

    const values = this.getSelectedDisplayValues(selection);
    const numericValues = values
      .map((value) => this.toNumber(value))
      .filter((value): value is number => value !== null);

    const count = numericValues.length;
    const sum = numericValues.reduce((total, value) => total + value, 0);
    const average = count === 0 ? null : sum / count;
    const min = count === 0 ? null : Math.min(...numericValues);
    const max = count === 0 ? null : Math.max(...numericValues);

    this.statusBar.textContent =
      `Count: ${count}` +
      ` | Sum: ${this.formatNumber(sum)}` +
      ` | Avg: ${average === null ? "-" : this.formatNumber(average)}` +
      ` | Min: ${min === null ? "-" : this.formatNumber(min)}` +
      ` | Max: ${max === null ? "-" : this.formatNumber(max)}`;
  }

  private getSelectedDisplayValues(selection: Selection): CellValue[] {
    const values: CellValue[] = [];

    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startColumn = Math.min(selection.startColumn, selection.endColumn);
    const endColumn = Math.max(selection.startColumn, selection.endColumn);

    this.dataStore.forEachCell((rowIndex, columnIndex) => {
      const isInsideSelection =
        rowIndex >= startRow &&
        rowIndex <= endRow &&
        columnIndex >= startColumn &&
        columnIndex <= endColumn;

      if (!isInsideSelection) {
        return;
      }

      values.push(this.dataStore.getCellDisplayValue(rowIndex, columnIndex));
    });

    return values;
  }

  private toNumber(value: CellValue): number | null {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const numericValue = Number(value);

      return Number.isNaN(numericValue) ? null : numericValue;
    }

    return null;
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(2);
  }
}