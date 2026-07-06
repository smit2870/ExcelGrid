import { GridConfig } from "./GridConfig";
import type { EmployeeRecord } from "../services/DataGenerator";

export type CellValue = string | number | null;

export class GridDataStore {
  private cells: Map<string, string | number>;
  private rowHeights: Map<number, number>;
  private columnWidths: Map<number, number>;

  private defaultRowHeight: number;
  private defaultColumnWidth: number;

  constructor(defaultRowHeight: number, defaultColumnWidth: number) {
    this.cells = new Map<string, string | number>();
    this.rowHeights = new Map<number, number>();
    this.columnWidths = new Map<number, number>();

    this.defaultRowHeight = defaultRowHeight;
    this.defaultColumnWidth = defaultColumnWidth;
  }

  private getCellKey(rowIndex: number, columnIndex: number): string {
    return `${rowIndex}:${columnIndex}`;
  }

  getCellValue(rowIndex: number, columnIndex: number): CellValue {
    const key = this.getCellKey(rowIndex, columnIndex);
    return this.cells.get(key) ?? null;
  }

  setCellValue(
    rowIndex: number,
    columnIndex: number,
    value: string | number
  ): void {
    const key = this.getCellKey(rowIndex, columnIndex);
    this.cells.set(key, value);
  }

  clearCellValue(rowIndex: number, columnIndex: number): void {
    const key = this.getCellKey(rowIndex, columnIndex);
    this.cells.delete(key);
  }

  getRowHeight(rowIndex: number): number {
    return this.rowHeights.get(rowIndex) ?? this.defaultRowHeight;
  }

  setRowHeight(rowIndex: number, height: number): void {
    const validHeight = Math.max(GridConfig.minRowHeight, height);
    this.rowHeights.set(rowIndex, validHeight);
  }

  getColumnWidth(columnIndex: number): number {
    return this.columnWidths.get(columnIndex) ?? this.defaultColumnWidth;
  }

  setColumnWidth(columnIndex: number, width: number): void {
    const validWidth = Math.max(GridConfig.minColumnWidth, width);
    this.columnWidths.set(columnIndex, validWidth);
  }

  loadEmployeeRecords(records: EmployeeRecord[]): void {
    records.forEach((record, rowIndex) => {
      this.setCellValue(rowIndex, 0, record.id);
      this.setCellValue(rowIndex, 1, record.firstName);
      this.setCellValue(rowIndex, 2, record.lastName);
      this.setCellValue(rowIndex, 3, record.age);
      this.setCellValue(rowIndex, 4, record.salary);
    });
  }

  forEachCell(
    callback: (
      rowIndex: number,
      columnIndex: number,
      value: string | number
    ) => void
  ): void {
    this.cells.forEach((value, key) => {
      const [rowIndexText, columnIndexText] = key.split(":");

      const rowIndex = Number(rowIndexText);
      const columnIndex = Number(columnIndexText);

      callback(rowIndex, columnIndex, value);
    });
  }
}