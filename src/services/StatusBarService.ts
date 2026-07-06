import type { GridDataStore } from "../core/GridDataStore";
import type { Selection } from "../models/Selection";
import {
    SelectionStatisticsService,
    type SelectionStatistics
} from "./SelectionStatisticsService";
import { CanvasUtils } from "../utils/CanvasUtils";

export class StatusBarService {
    private statusBar: HTMLElement | null;
    private dataStore: GridDataStore;

    constructor(statusBar: HTMLElement | null, dataStore: GridDataStore) {
        this.statusBar = statusBar;
        this.dataStore = dataStore;
    }

    updateForSelection(selection: Selection | null): void {
        if (!selection) {
            this.reset();
            return;
        }

        if (selection.type === "cell") {
            this.updateCell(selection.startRow, selection.startColumn, selection);
            return;
        }

        if (selection.type === "row") {
            this.updateRow(selection.startRow, selection);
            return;
        }

        if (selection.type === "column") {
            this.updateColumn(selection.startColumn, selection);
            return;
        }

        if (selection.type === "range") {
            this.updateRange(
                selection.startRow,
                selection.startColumn,
                selection.endRow,
                selection.endColumn,
                selection
            );
        }
    }

    updateCell(
        rowIndex: number,
        columnIndex: number,
        selection: Selection | null
    ): void {
        if (!this.statusBar) {
            return;
        }

        const statistics = SelectionStatisticsService.calculate(
            selection,
            this.dataStore
        );

        const columnName = CanvasUtils.getColumnName(columnIndex);
        const rowNumber = rowIndex + 1;
        const selectedCellName = `${columnName}${rowNumber}`;

        this.statusBar.textContent = `Selected Cell: ${selectedCellName} | ${this.formatStatistics(
            statistics
        )}`;
    }

    updateRow(rowIndex: number, selection: Selection | null): void {
        if (!this.statusBar) {
            return;
        }

        const statistics = SelectionStatisticsService.calculate(
            selection,
            this.dataStore
        );

        const rowNumber = rowIndex + 1;

        this.statusBar.textContent = `Selected Row: ${rowNumber} | ${this.formatStatistics(
            statistics
        )}`;
    }

    updateColumn(columnIndex: number, selection: Selection | null): void {
        if (!this.statusBar) {
            return;
        }

        const statistics = SelectionStatisticsService.calculate(
            selection,
            this.dataStore
        );

        const columnName = CanvasUtils.getColumnName(columnIndex);

        this.statusBar.textContent = `Selected Column: ${columnName} | ${this.formatStatistics(
            statistics
        )}`;
    }

    updateRange(
        startRow: number,
        startColumn: number,
        endRow: number,
        endColumn: number,
        selection: Selection | null
    ): void {
        if (!this.statusBar) {
            return;
        }

        const normalizedStartRow = Math.min(startRow, endRow);
        const normalizedEndRow = Math.max(startRow, endRow);
        const normalizedStartColumn = Math.min(startColumn, endColumn);
        const normalizedEndColumn = Math.max(startColumn, endColumn);

        const startCellName = `${CanvasUtils.getColumnName(
            normalizedStartColumn
        )}${normalizedStartRow + 1}`;

        const endCellName = `${CanvasUtils.getColumnName(
            normalizedEndColumn
        )}${normalizedEndRow + 1}`;

        const statistics = SelectionStatisticsService.calculate(
            selection,
            this.dataStore
        );

        this.statusBar.textContent = `Selected Range: ${startCellName}:${endCellName} | ${this.formatStatistics(
            statistics
        )}`;
    }

    reset(): void {
        if (!this.statusBar) {
            return;
        }

        this.statusBar.textContent = this.formatStatistics({
            count: 0,
            sum: 0,
            average: 0,
            min: null,
            max: null
        });
    }

    private formatStatistics(statistics: SelectionStatistics): string {
        const average =
            statistics.count === 0 ? "-" : Number(statistics.average.toFixed(2));

        return `Count: ${statistics.count} | Sum: ${statistics.sum} | Avg: ${average} | Min: ${statistics.min ?? "-"
            } | Max: ${statistics.max ?? "-"}`;
    }
}