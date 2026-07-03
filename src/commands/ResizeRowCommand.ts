import type { ICommand } from "./ICommand";
import type { GridDataStore } from "../core/GridDataStore";

export class ResizeRowCommand implements ICommand {
  private dataStore: GridDataStore;
  private rowIndex: number;
  private oldHeight: number;
  private newHeight: number;

  constructor(
    dataStore: GridDataStore,
    rowIndex: number,
    oldHeight: number,
    newHeight: number
  ) {
    this.dataStore = dataStore;
    this.rowIndex = rowIndex;
    this.oldHeight = oldHeight;
    this.newHeight = newHeight;
  }

  execute(): void {
    this.dataStore.setRowHeight(this.rowIndex, this.newHeight);
  }

  undo(): void {
    this.dataStore.setRowHeight(this.rowIndex, this.oldHeight);
  }
}