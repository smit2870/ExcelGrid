import type { ICommand } from "./ICommand";
import type { CellValue, GridDataStore } from "../core/GridDataStore";

interface ClearedCell {
    rowIndex: number;
    columnIndex: number;
    oldValue: CellValue;
}

export class ClearCellsCommand implements ICommand {
    private dataStore: GridDataStore;
    private cells: ClearedCell[];

    constructor(dataStore: GridDataStore, cells: ClearedCell[]) {
        this.dataStore = dataStore;
        this.cells = cells;
    }

    execute(): void {
        for (const cell of this.cells) {
            this.dataStore.clearCellValue(cell.rowIndex, cell.columnIndex);
        }
    }

    undo(): void {
        for (const cell of this.cells) {
            if (cell.oldValue === null || cell.oldValue === "") {
                this.dataStore.clearCellValue(cell.rowIndex, cell.columnIndex);
                continue;
            }

            this.dataStore.setCellValue(
                cell.rowIndex,
                cell.columnIndex,
                cell.oldValue
            );
        }
    }
}