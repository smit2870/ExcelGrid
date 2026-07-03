import type { ICommand } from "./ICommand";
import type { CellValue } from "../core/GridDataStore";
import { GridDataStore } from "../core/GridDataStore";

export class EditCellCommand implements ICommand {
  private dataStore: GridDataStore;
  private rowIndex: number;
  private columnIndex: number;
  private oldValue: CellValue;
  private newValue: CellValue;

  constructor(
    dataStore: GridDataStore,
    rowIndex: number,
    columnIndex: number,
    oldValue: CellValue,
    newValue: CellValue
  ) {
    this.dataStore = dataStore;
    this.rowIndex = rowIndex;
    this.columnIndex = columnIndex;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  execute(): void {
    if (this.newValue === null || this.newValue === "") {
      this.dataStore.clearCellValue(this.rowIndex, this.columnIndex);
      return;
    }

    this.dataStore.setCellValue(
      this.rowIndex,
      this.columnIndex,
      this.newValue
    );
  }

  undo(): void {
    if (this.oldValue === null || this.oldValue === "") {
      this.dataStore.clearCellValue(this.rowIndex, this.columnIndex);
      return;
    }

    this.dataStore.setCellValue(
      this.rowIndex,
      this.columnIndex,
      this.oldValue
    );
  }
}