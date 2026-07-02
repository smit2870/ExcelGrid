import { Selection } from "../models/Selection";

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

  getSelection(): Selection | null {
    return this.currentSelection;
  }

  clearSelection(): void {
    this.currentSelection = null;
  }
}