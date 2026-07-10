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

    const stats = this.calculateStatsForSelection(selection);

    const average = stats.count === 0 ? null : stats.sum / stats.count;

    this.statusBar.textContent =
      `Count: ${stats.count}` +
      ` | Sum: ${this.formatNumber(stats.sum)}` +
      ` | Avg: ${average === null ? "-" : this.formatNumber(average)}` +
      ` | Min: ${stats.min === null ? "-" : this.formatNumber(stats.min)}` +
      ` | Max: ${stats.max === null ? "-" : this.formatNumber(stats.max)}`;
  }

  private calculateStatsForSelection(selection: Selection): {
    count: number;
    sum: number;
    min: number | null;
    max: number | null;
  } {
    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startColumn = Math.min(selection.startColumn, selection.endColumn);
    const endColumn = Math.max(selection.startColumn, selection.endColumn);

    let count = 0;
    let sum = 0;
    let min: number | null = null;
    let max: number | null = null;

    this.dataStore.forEachCell((rowIndex, columnIndex) => {
      const isInsideSelection =
        rowIndex >= startRow &&
        rowIndex <= endRow &&
        columnIndex >= startColumn &&
        columnIndex <= endColumn;

      if (!isInsideSelection) {
        return;
      }

      const displayValue = this.dataStore.getCellDisplayValue(
        rowIndex,
        columnIndex
      );

      const numericValue = this.toNumber(displayValue);

      if (numericValue === null) {
        return;
      }

      count++;
      sum += numericValue;

      if (min === null || numericValue < min) {
        min = numericValue;
      }

      if (max === null || numericValue > max) {
        max = numericValue;
      }
    });

    return {
      count,
      sum,
      min,
      max
    };
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