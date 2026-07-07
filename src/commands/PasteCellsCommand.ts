import type { ICommand } from "./ICommand";
import type { CellValue, GridDataStore } from "../core/GridDataStore";

export interface PastedCell {
    rowIndex: number;
    columnIndex: number;
    oldValue: CellValue;
    newValue: CellValue;
}

export class PasteCellsCommand implements ICommand {
    private dataStore: GridDataStore;
    private cells: PastedCell[];

    constructor(dataStore: GridDataStore, cells: PastedCell[]) {
        this.dataStore = dataStore;
        this.cells = cells;
    }

    execute(): void {
        for (const cell of this.cells) {
            if (cell.newValue === null || cell.newValue === "") {
                this.dataStore.clearCellValue(cell.rowIndex, cell.columnIndex);
                continue;
            }

            this.dataStore.setCellValue(
                cell.rowIndex,
                cell.columnIndex,
                cell.newValue
            );
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