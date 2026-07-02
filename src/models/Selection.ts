export type SelectionType = "cell" | "row" | "column" | "range";

export class Selection {
  type: SelectionType;
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;

  constructor(
    type: SelectionType,
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number
  ) {
    this.type = type;
    this.startRow = startRow;
    this.startColumn = startColumn;
    this.endRow = endRow;
    this.endColumn = endColumn;
  }
}