import type { Selection } from "../models/Selection";
import { GridDataStore } from "../core/GridDataStore";

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
            return {
                count: 0,
                sum: 0,
                average: 0,
                min: null,
                max: null
            };
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

        for (let row = startRow; row <= endRow; row++) {
            for (let column = startColumn; column <= endColumn; column++) {
                const value = dataStore.getCellValue(row, column);

                if (typeof value !== "number") {
                    continue;
                }

                count++;
                sum += value;

                if (min === null || value < min) {
                    min = value;
                }

                if (max === null || value > max) {
                    max = value;
                }
            }
        }

        return {
            count,
            sum,
            average: count === 0 ? 0 : sum / count,
            min,
            max
        };
    }
}