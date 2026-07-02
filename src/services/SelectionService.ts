import { Selection } from "../models/Selection";
import { GridConfig } from "../core/GridConfig";

export class SelectionService {
  private currentSelection: Selection | null;

  constructor() {
    this.currentSelection = null;
  }

  setCellSelection(rowIndex: number, columnIndex: number): void {
    this.currentSelection = new Selection(
      "cell",
      rowIndex,
      columnIndex,
      rowIndex,
      columnIndex
    );
  }

  setRowSelection(rowIndex: number): void {
    this.currentSelection = new Selection(
      "row",
      rowIndex,
      0,
      rowIndex,
      GridConfig.totalColumns - 1
    );
  }

  setColumnSelection(columnIndex: number): void {
    this.currentSelection = new Selection(
      "column",
      0,
      columnIndex,
      GridConfig.totalRows - 1,
      columnIndex
    );
  }

  getSelection(): Selection | null {
    return this.currentSelection;
  }

  clearSelection(): void {
    this.currentSelection = null;
  }
}