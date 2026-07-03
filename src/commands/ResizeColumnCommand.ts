import type { ICommand } from "./ICommand";
import { GridDataStore } from "../core/GridDataStore";

export class ResizeColumnCommand implements ICommand {
  private dataStore: GridDataStore;
  private columnIndex: number;
  private oldWidth: number;
  private newWidth: number;

  constructor(
    dataStore: GridDataStore,
    columnIndex: number,
    oldWidth: number,
    newWidth: number
  ) {
    this.dataStore = dataStore;
    this.columnIndex = columnIndex;
    this.oldWidth = oldWidth;
    this.newWidth = newWidth;
  }

  execute(): void {
    this.dataStore.setColumnWidth(this.columnIndex, this.newWidth);
  }

  undo(): void {
    this.dataStore.setColumnWidth(this.columnIndex, this.oldWidth);
  }
}