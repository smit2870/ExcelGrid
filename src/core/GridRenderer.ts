import { GridConfig } from "./GridConfig";
import type { GridDataStore } from "./GridDataStore";
import type { Selection } from "../models/Selection";
import { CanvasUtils } from "../utils/CanvasUtils";

export class GridRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private dataStore: GridDataStore;

  constructor(canvas: HTMLCanvasElement, dataStore: GridDataStore) {
    this.canvas = canvas;
    this.dataStore = dataStore;

    const context = this.canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    this.context = context;
  }

  render(scrollX: number, scrollY: number, selection: Selection | null): void {
    this.clearCanvas();

    this.drawGrid(scrollX, scrollY);
    this.drawHeaders(scrollX, scrollY, selection);
    this.drawSelection(scrollX, scrollY, selection);
  }

  private clearCanvas(): void {
    this.context.clearRect(
      0,
      0,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );

    this.context.fillStyle = GridConfig.backgroundColor;
    this.context.fillRect(
      0,
      0,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
  }

  private drawGrid(scrollX: number, scrollY: number): void {
    const visibleColumns = this.getVisibleColumns(scrollX);
    const visibleRows = this.getVisibleRows(scrollY);

    this.context.font = GridConfig.font;
    this.context.textBaseline = "middle";
    this.context.textAlign = "left";

    for (const column of visibleColumns) {
      for (const row of visibleRows) {
        this.drawCell(
          row.rowIndex,
          column.columnIndex,
          column.x,
          row.y,
          column.width,
          row.height
        );
      }
    }
  }

  private drawCell(
    rowIndex: number,
    columnIndex: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    this.context.fillStyle = GridConfig.backgroundColor;
    this.context.fillRect(x, y, width, height);

    this.context.strokeStyle = GridConfig.gridLineColor;
    this.context.lineWidth = 1;
    this.context.strokeRect(x, y, width, height);

    const value = this.dataStore.getCellDisplayValue(rowIndex, columnIndex);

    if (value === null) {
      return;
    }

    const text = String(value);

    this.context.save();

    this.context.beginPath();
    this.context.rect(x + 1, y + 1, width - 2, height - 2);
    this.context.clip();

    this.context.fillStyle = GridConfig.cellTextColor;
    this.context.font = GridConfig.font;
    this.context.textAlign = "left";
    this.context.textBaseline = "middle";

    this.context.fillText(text, x + 6, y + height / 2);

    this.context.restore();
  }

  private drawHeaders(
    scrollX: number,
    scrollY: number,
    selection: Selection | null
  ): void {
    this.drawColumnHeaders(scrollX, selection);
    this.drawRowHeaders(scrollY, selection);
    this.drawTopLeftCorner();
  }

  private drawColumnHeaders(
    scrollX: number,
    selection: Selection | null
  ): void {
    const visibleColumns = this.getVisibleColumns(scrollX);

    for (const column of visibleColumns) {
      const isSelected = this.isColumnSelected(column.columnIndex, selection);

      this.context.fillStyle = isSelected
        ? GridConfig.selectedHeaderBackgroundColor
        : GridConfig.headerBackgroundColor;

      this.context.fillRect(
        column.x,
        0,
        column.width,
        GridConfig.columnHeaderHeight
      );

      this.context.strokeStyle = GridConfig.gridLineColor;
      this.context.lineWidth = 1;
      this.context.strokeRect(
        column.x,
        0,
        column.width,
        GridConfig.columnHeaderHeight
      );

      this.context.fillStyle = isSelected
        ? GridConfig.selectedHeaderTextColor
        : GridConfig.headerTextColor;

      this.context.font = GridConfig.headerFont;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";

      this.context.fillText(
        CanvasUtils.getColumnName(column.columnIndex),
        column.x + column.width / 2,
        GridConfig.columnHeaderHeight / 2
      );
    }

    this.context.textAlign = "left";
  }

  private drawRowHeaders(scrollY: number, selection: Selection | null): void {
    const visibleRows = this.getVisibleRows(scrollY);

    for (const row of visibleRows) {
      const isSelected = this.isRowSelected(row.rowIndex, selection);

      this.context.fillStyle = isSelected
        ? GridConfig.selectedHeaderBackgroundColor
        : GridConfig.headerBackgroundColor;

      this.context.fillRect(
        0,
        row.y,
        GridConfig.rowHeaderWidth,
        row.height
      );

      this.context.strokeStyle = GridConfig.gridLineColor;
      this.context.lineWidth = 1;
      this.context.strokeRect(
        0,
        row.y,
        GridConfig.rowHeaderWidth,
        row.height
      );

      this.context.fillStyle = isSelected
        ? GridConfig.selectedHeaderTextColor
        : GridConfig.headerTextColor;

      this.context.font = GridConfig.headerFont;
      this.context.textAlign = "center";
      this.context.textBaseline = "middle";

      this.context.fillText(
        String(row.rowIndex + 1),
        GridConfig.rowHeaderWidth / 2,
        row.y + row.height / 2
      );
    }

    this.context.textAlign = "left";
  }

  private drawTopLeftCorner(): void {
    this.context.fillStyle = GridConfig.headerBackgroundColor;
    this.context.fillRect(
      0,
      0,
      GridConfig.rowHeaderWidth,
      GridConfig.columnHeaderHeight
    );

    this.context.strokeStyle = GridConfig.gridLineColor;
    this.context.lineWidth = 1;
    this.context.strokeRect(
      0,
      0,
      GridConfig.rowHeaderWidth,
      GridConfig.columnHeaderHeight
    );
  }

  private drawSelection(
    scrollX: number,
    scrollY: number,
    selection: Selection | null
  ): void {
    if (!selection) {
      return;
    }

    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startColumn = Math.min(selection.startColumn, selection.endColumn);
    const endColumn = Math.max(selection.startColumn, selection.endColumn);

    const startX = this.getColumnX(startColumn, scrollX);
    const endX =
      this.getColumnX(endColumn, scrollX) +
      this.dataStore.getColumnWidth(endColumn);

    const startY = this.getRowY(startRow, scrollY);
    const endY =
      this.getRowY(endRow, scrollY) + this.dataStore.getRowHeight(endRow);

    const selectionX = Math.max(startX, GridConfig.rowHeaderWidth);
    const selectionY = Math.max(startY, GridConfig.columnHeaderHeight);

    const selectionWidth =
      Math.min(endX, this.canvas.clientWidth) - selectionX;

    const selectionHeight =
      Math.min(endY, this.canvas.clientHeight) - selectionY;

    if (selectionWidth <= 0 || selectionHeight <= 0) {
      return;
    }

    this.context.save();

    this.context.fillStyle = GridConfig.selectedCellFillColor;
    this.context.fillRect(
      selectionX,
      selectionY,
      selectionWidth,
      selectionHeight
    );

    this.context.strokeStyle = GridConfig.rangeBorderColor;
    this.context.lineWidth = GridConfig.rangeBorderWidth;
    this.context.strokeRect(
      selectionX,
      selectionY,
      selectionWidth,
      selectionHeight
    );

    this.context.restore();
  }

  private isColumnSelected(
    columnIndex: number,
    selection: Selection | null
  ): boolean {
    if (!selection) {
      return false;
    }

    const startColumn = Math.min(selection.startColumn, selection.endColumn);
    const endColumn = Math.max(selection.startColumn, selection.endColumn);

    return columnIndex >= startColumn && columnIndex <= endColumn;
  }

  private isRowSelected(rowIndex: number, selection: Selection | null): boolean {
    if (!selection) {
      return false;
    }

    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);

    return rowIndex >= startRow && rowIndex <= endRow;
  }

  private getVisibleColumns(scrollX: number): Array<{
    columnIndex: number;
    x: number;
    width: number;
  }> {
    const columns: Array<{
      columnIndex: number;
      x: number;
      width: number;
    }> = [];

    let x = GridConfig.rowHeaderWidth - scrollX;

    for (
      let columnIndex = 0;
      columnIndex < GridConfig.totalColumns;
      columnIndex++
    ) {
      const width = this.dataStore.getColumnWidth(columnIndex);

      if (
        x + width >= GridConfig.rowHeaderWidth &&
        x <= this.canvas.clientWidth
      ) {
        columns.push({
          columnIndex,
          x,
          width
        });
      }

      x += width;

      if (x > this.canvas.clientWidth) {
        break;
      }
    }

    return columns;
  }

  private getVisibleRows(scrollY: number): Array<{
    rowIndex: number;
    y: number;
    height: number;
  }> {
    const rows: Array<{
      rowIndex: number;
      y: number;
      height: number;
    }> = [];

    let y = GridConfig.columnHeaderHeight - scrollY;

    for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
      const height = this.dataStore.getRowHeight(rowIndex);

      if (
        y + height >= GridConfig.columnHeaderHeight &&
        y <= this.canvas.clientHeight
      ) {
        rows.push({
          rowIndex,
          y,
          height
        });
      }

      y += height;

      if (y > this.canvas.clientHeight) {
        break;
      }
    }

    return rows;
  }

  private getColumnX(columnIndex: number, scrollX: number): number {
    let x = GridConfig.rowHeaderWidth - scrollX;

    for (let index = 0; index < columnIndex; index++) {
      x += this.dataStore.getColumnWidth(index);
    }

    return x;
  }

  private getRowY(rowIndex: number, scrollY: number): number {
    let y = GridConfig.columnHeaderHeight - scrollY;

    for (let index = 0; index < rowIndex; index++) {
      y += this.dataStore.getRowHeight(index);
    }

    return y;
  }
}