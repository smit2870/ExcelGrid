import { GridConfig } from "./GridConfig";
import type { EmployeeRecord } from "../services/DataGenerator";
import { FormulaService } from "../services/FormulaService";
import type {
  SerializedCell,
  SerializedColumnWidth,
  SerializedRowHeight
} from "../services/PersistenceService";

export type CellValue = string | number | null;

export class GridDataStore {
  private cells: Map<string, string | number>;
  private rowHeights: Map<number, number>;
  private columnWidths: Map<number, number>;
  private formulaService: FormulaService;

  private defaultRowHeight: number;
  private defaultColumnWidth: number;

  constructor(defaultRowHeight: number, defaultColumnWidth: number) {
    this.cells = new Map<string, string | number>();
    this.rowHeights = new Map<number, number>();
    this.columnWidths = new Map<number, number>();
    this.formulaService = new FormulaService();

    this.defaultRowHeight = defaultRowHeight;
    this.defaultColumnWidth = defaultColumnWidth;
  }

  private getCellKey(rowIndex: number, columnIndex: number): string {
    return `${rowIndex}:${columnIndex}`;
  }

  getCellValue(rowIndex: number, columnIndex: number): CellValue {
    return this.getCellRawValue(rowIndex, columnIndex);
  }

  getCellRawValue(rowIndex: number, columnIndex: number): CellValue {
    const key = this.getCellKey(rowIndex, columnIndex);

    return this.cells.get(key) ?? null;
  }

  getCellDisplayValue(rowIndex: number, columnIndex: number): CellValue {
    const rawValue = this.getCellRawValue(rowIndex, columnIndex);

    if (!this.formulaService.isFormula(rawValue)) {
      return rawValue;
    }

    return this.formulaService.evaluateCell(rowIndex, columnIndex, this);
  }

  setCellValue(
    rowIndex: number,
    columnIndex: number,
    value: CellValue
  ): void {
    if (value === null || value === "") {
      this.clearCellValue(rowIndex, columnIndex);
      return;
    }

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
    this.cells.clear();

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

  forEachDisplayCell(
    callback: (
      rowIndex: number,
      columnIndex: number,
      value: CellValue
    ) => void
  ): void {
    this.cells.forEach((_value, key) => {
      const [rowIndexText, columnIndexText] = key.split(":");

      const rowIndex = Number(rowIndexText);
      const columnIndex = Number(columnIndexText);

      callback(
        rowIndex,
        columnIndex,
        this.getCellDisplayValue(rowIndex, columnIndex)
      );
    });
  }

  getUsedRange(): {
    startRow: number;
    endRow: number;
    startColumn: number;
    endColumn: number;
  } | null {
    if (this.cells.size === 0) {
      return null;
    }

    let startRow = Number.POSITIVE_INFINITY;
    let endRow = Number.NEGATIVE_INFINITY;
    let startColumn = Number.POSITIVE_INFINITY;
    let endColumn = Number.NEGATIVE_INFINITY;

    this.forEachCell((rowIndex, columnIndex) => {
      startRow = Math.min(startRow, rowIndex);
      endRow = Math.max(endRow, rowIndex);
      startColumn = Math.min(startColumn, columnIndex);
      endColumn = Math.max(endColumn, columnIndex);
    });

    return {
      startRow,
      endRow,
      startColumn,
      endColumn
    };
  }

  getSerializableCells(): SerializedCell[] {
    const serializedCells: SerializedCell[] = [];

    this.forEachCell((rowIndex, columnIndex, value) => {
      serializedCells.push({
        rowIndex,
        columnIndex,
        value
      });
    });

    return serializedCells;
  }

  loadSerializedCells(cells: SerializedCell[]): void {
    this.cells.clear();

    for (const cell of cells) {
      this.setCellValue(cell.rowIndex, cell.columnIndex, cell.value);
    }
  }

  getSerializableRowHeights(): SerializedRowHeight[] {
    const serializedRowHeights: SerializedRowHeight[] = [];

    this.rowHeights.forEach((height, rowIndex) => {
      serializedRowHeights.push({
        rowIndex,
        height
      });
    });

    return serializedRowHeights;
  }

  loadSerializedRowHeights(rowHeights: SerializedRowHeight[]): void {
    this.rowHeights.clear();

    for (const rowHeight of rowHeights) {
      this.setRowHeight(rowHeight.rowIndex, rowHeight.height);
    }
  }

  getSerializableColumnWidths(): SerializedColumnWidth[] {
    const serializedColumnWidths: SerializedColumnWidth[] = [];

    this.columnWidths.forEach((width, columnIndex) => {
      serializedColumnWidths.push({
        columnIndex,
        width
      });
    });

    return serializedColumnWidths;
  }

  loadSerializedColumnWidths(columnWidths: SerializedColumnWidth[]): void {
    this.columnWidths.clear();

    for (const columnWidth of columnWidths) {
      this.setColumnWidth(columnWidth.columnIndex, columnWidth.width);
    }
  }
}