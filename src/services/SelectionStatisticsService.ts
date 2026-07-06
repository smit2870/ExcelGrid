import type { Selection } from "../models/Selection";
import type { GridDataStore } from "../core/GridDataStore";

export interface SelectionStatistics {
    count: number;
    sum: number;
    average: number;
    min: number | null;
    max: number | null;
}

export class SelectionStatisticsService {
    static calculate(
        selection: Selection | null,
        dataStore: GridDataStore
    ): SelectionStatistics {
        if (!selection) {
            return this.getEmptyStatistics();
        }

        const startRow = Math.min(selection.startRow, selection.endRow);
        const endRow = Math.max(selection.startRow, selection.endRow);

        const startColumn = Math.min(
            selection.startColumn,
            selection.endColumn
        );

        const endColumn = Math.max(
            selection.startColumn,
            selection.endColumn
        );

        let count = 0;
        let sum = 0;
        let min: number | null = null;
        let max: number | null = null;

        dataStore.forEachCell((rowIndex, columnIndex, value) => {
            const isInsideSelectedRows =
                rowIndex >= startRow && rowIndex <= endRow;

            const isInsideSelectedColumns =
                columnIndex >= startColumn && columnIndex <= endColumn;

            if (!isInsideSelectedRows || !isInsideSelectedColumns) {
                return;
            }

            if (typeof value !== "number") {
                return;
            }

            count++;
            sum += value;

            if (min === null || value < min) {
                min = value;
            }

            if (max === null || value > max) {
                max = value;
            }
        });

        return {
            count,
            sum,
            average: count === 0 ? 0 : sum / count,
            min,
            max
        };
    }

    private static getEmptyStatistics(): SelectionStatistics {
        return {
            count: 0,
            sum: 0,
            average: 0,
            min: null,
            max: null
        };
    }
}