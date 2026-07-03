import { GridConfig } from "./GridConfig";
import type { GridDataStore } from "./GridDataStore";
import { CanvasUtils } from "../utils/CanvasUtils";
import type { Selection } from "../models/Selection";

interface VisibleColumn {
  columnIndex: number;
  x: number;
  width: number;
}

interface VisibleRow {
  rowIndex: number;
  y: number;
  height: number;
}

export class GridRenderer {
  private canvas: HTMLCanvasElement;
  private dataStore: GridDataStore;
  private context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, dataStore: GridDataStore) {
    this.canvas = canvas;
    this.dataStore = dataStore;

    const context = this.canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is not supported.");
    }

    this.context = context;
  }

  render(scrollX: number, scrollY: number, selection: Selection | null): void {
    this.clearCanvas();

    this.drawBackground();
    this.drawCells(scrollX, scrollY);
    this.drawGridLines(scrollX, scrollY);
    this.drawSelection(scrollX, scrollY, selection);
    this.drawColumnHeaders(scrollX);
    this.drawRowHeaders(scrollY);
    this.drawTopLeftCorner();
  }

  private clearCanvas(): void {
    this.context.clearRect(
      0,
      0,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
  }

  private drawBackground(): void {
    this.context.fillStyle = "#ffffff";

    this.context.fillRect(
      0,
      0,
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
  }

  private getVisibleColumns(scrollX: number): VisibleColumn[] {
    const visibleColumns: VisibleColumn[] = [];

    let currentX = GridConfig.rowHeaderWidth - scrollX;

    for (
      let columnIndex = 0;
      columnIndex < GridConfig.totalColumns;
      columnIndex++
    ) {
      const width = this.dataStore.getColumnWidth(columnIndex);

      const isVisible =
        currentX + width >= GridConfig.rowHeaderWidth &&
        currentX <= this.canvas.clientWidth;

      if (isVisible) {
        visibleColumns.push({
          columnIndex,
          x: currentX,
          width
        });
      }

      currentX += width;

      if (currentX > this.canvas.clientWidth) {
        break;
      }
    }

    return visibleColumns;
  }

  private getVisibleRows(scrollY: number): VisibleRow[] {
    const visibleRows: VisibleRow[] = [];

    let currentY = GridConfig.columnHeaderHeight - scrollY;

    for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
      const height = this.dataStore.getRowHeight(rowIndex);

      const isVisible =
        currentY + height >= GridConfig.columnHeaderHeight &&
        currentY <= this.canvas.clientHeight;

      if (isVisible) {
        visibleRows.push({
          rowIndex,
          y: currentY,
          height
        });
      }

      currentY += height;

      if (currentY > this.canvas.clientHeight) {
        break;
      }
    }

    return visibleRows;
  }

  private getColumnBounds(
    columnIndex: number,
    scrollX: number
  ): { x: number; width: number } | null {
    if (columnIndex < 0 || columnIndex >= GridConfig.totalColumns) {
      return null;
    }

    let x = GridConfig.rowHeaderWidth - scrollX;

    for (let index = 0; index < columnIndex; index++) {
      x += this.dataStore.getColumnWidth(index);
    }

    return {
      x,
      width: this.dataStore.getColumnWidth(columnIndex)
    };
  }

  private getRowBounds(
    rowIndex: number,
    scrollY: number
  ): { y: number; height: number } | null {
    if (rowIndex < 0 || rowIndex >= GridConfig.totalRows) {
      return null;
    }

    let y = GridConfig.columnHeaderHeight - scrollY;

    for (let index = 0; index < rowIndex; index++) {
      y += this.dataStore.getRowHeight(index);
    }

    return {
      y,
      height: this.dataStore.getRowHeight(rowIndex)
    };
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

    this.context.strokeRect(
      0,
      0,
      GridConfig.rowHeaderWidth,
      GridConfig.columnHeaderHeight
    );
  }

  private drawColumnHeaders(scrollX: number): void {
    const visibleColumns = this.getVisibleColumns(scrollX);

    this.context.font = GridConfig.headerFont;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    for (const column of visibleColumns) {
      this.context.fillStyle = GridConfig.headerBackgroundColor;

      this.context.fillRect(
        column.x,
        0,
        column.width,
        GridConfig.columnHeaderHeight
      );

      this.context.strokeStyle = GridConfig.gridLineColor;

      this.context.strokeRect(
        column.x,
        0,
        column.width,
        GridConfig.columnHeaderHeight
      );

      this.context.fillStyle = GridConfig.headerTextColor;

      this.context.fillText(
        CanvasUtils.getColumnName(column.columnIndex),
        column.x + column.width / 2,
        GridConfig.columnHeaderHeight / 2
      );
    }
  }

  private drawRowHeaders(scrollY: number): void {
    const visibleRows = this.getVisibleRows(scrollY);

    this.context.font = GridConfig.headerFont;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    for (const row of visibleRows) {
      this.context.fillStyle = GridConfig.headerBackgroundColor;

      this.context.fillRect(
        0,
        row.y,
        GridConfig.rowHeaderWidth,
        row.height
      );

      this.context.strokeStyle = GridConfig.gridLineColor;

      this.context.strokeRect(
        0,
        row.y,
        GridConfig.rowHeaderWidth,
        row.height
      );

      this.context.fillStyle = GridConfig.headerTextColor;

      this.context.fillText(
        String(row.rowIndex + 1),
        GridConfig.rowHeaderWidth / 2,
        row.y + row.height / 2
      );
    }
  }

  private drawCells(scrollX: number, scrollY: number): void {
    const visibleColumns = this.getVisibleColumns(scrollX);
    const visibleRows = this.getVisibleRows(scrollY);

    this.context.font = GridConfig.font;
    this.context.textAlign = "left";
    this.context.textBaseline = "middle";

    for (const row of visibleRows) {
      for (const column of visibleColumns) {
        const value = this.dataStore.getCellValue(
          row.rowIndex,
          column.columnIndex
        );

        if (value !== null) {
          this.context.save();

          this.context.beginPath();
          this.context.rect(
            column.x + 1,
            row.y + 1,
            column.width - 2,
            row.height - 2
          );
          this.context.clip();

          this.context.fillStyle = GridConfig.cellTextColor;

          this.drawCellText(
            String(value),
            column.x,
            row.y,
            column.width,
            row.height
          );

          this.context.restore();
        }
      }
    }
  }

  private drawGridLines(scrollX: number, scrollY: number): void {
    const visibleColumns = this.getVisibleColumns(scrollX);
    const visibleRows = this.getVisibleRows(scrollY);

    this.context.strokeStyle = GridConfig.gridLineColor;
    this.context.lineWidth = 1;

    for (const row of visibleRows) {
      this.context.beginPath();
      this.context.moveTo(GridConfig.rowHeaderWidth, row.y);
      this.context.lineTo(this.canvas.clientWidth, row.y);
      this.context.stroke();

      this.context.beginPath();
      this.context.moveTo(GridConfig.rowHeaderWidth, row.y + row.height);
      this.context.lineTo(this.canvas.clientWidth, row.y + row.height);
      this.context.stroke();
    }

    for (const column of visibleColumns) {
      this.context.beginPath();
      this.context.moveTo(column.x, GridConfig.columnHeaderHeight);
      this.context.lineTo(column.x, this.canvas.clientHeight);
      this.context.stroke();

      this.context.beginPath();
      this.context.moveTo(column.x + column.width, GridConfig.columnHeaderHeight);
      this.context.lineTo(column.x + column.width, this.canvas.clientHeight);
      this.context.stroke();
    }
  }

  private drawSelection(
    scrollX: number,
    scrollY: number,
    selection: Selection | null
  ): void {
    if (!selection) {
      return;
    }

    if (selection.type === "cell") {
      this.drawCellSelection(scrollX, scrollY, selection);
      return;
    }

    if (selection.type === "row") {
      this.drawRowSelection(scrollY, selection);
      return;
    }

    if (selection.type === "column") {
      this.drawColumnSelection(scrollX, selection);
      return;
    }

    if (selection.type === "range") {
      this.drawRangeSelection(scrollX, scrollY, selection);
    }
  }

  private drawCellText(
    text: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const lines = text.split("\n");
    const lineHeight = 16;
    const paddingX = 6;
    const paddingY = 4;

    let textY = y + paddingY + lineHeight / 2;

    for (const line of lines) {
      if (textY > y + height - paddingY) {
        break;
      }

      this.context.fillText(line, x + paddingX, textY);
      textY += lineHeight;
    }
  }

  private drawCellSelection(
    scrollX: number,
    scrollY: number,
    selection: Selection
  ): void {
    const columnBounds = this.getColumnBounds(selection.startColumn, scrollX);
    const rowBounds = this.getRowBounds(selection.startRow, scrollY);

    if (!columnBounds || !rowBounds) {
      return;
    }

    const isVisible =
      columnBounds.x + columnBounds.width >= GridConfig.rowHeaderWidth &&
      columnBounds.x <= this.canvas.clientWidth &&
      rowBounds.y + rowBounds.height >= GridConfig.columnHeaderHeight &&
      rowBounds.y <= this.canvas.clientHeight;

    if (!isVisible) {
      return;
    }

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      columnBounds.x,
      rowBounds.y,
      columnBounds.width,
      rowBounds.height
    );

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      columnBounds.x + 1,
      rowBounds.y + 1,
      columnBounds.width - 2,
      rowBounds.height - 2
    );

    this.context.lineWidth = 1;
  }

  private drawRowSelection(scrollY: number, selection: Selection): void {
    const rowBounds = this.getRowBounds(selection.startRow, scrollY);

    if (!rowBounds) {
      return;
    }

    const isVisible =
      rowBounds.y + rowBounds.height >= GridConfig.columnHeaderHeight &&
      rowBounds.y <= this.canvas.clientHeight;

    if (!isVisible) {
      return;
    }

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      GridConfig.rowHeaderWidth,
      rowBounds.y,
      this.canvas.clientWidth - GridConfig.rowHeaderWidth,
      rowBounds.height
    );

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      GridConfig.rowHeaderWidth + 1,
      rowBounds.y + 1,
      this.canvas.clientWidth - GridConfig.rowHeaderWidth - 2,
      rowBounds.height - 2
    );

    this.context.lineWidth = 1;
  }

  private drawColumnSelection(scrollX: number, selection: Selection): void {
    const columnBounds = this.getColumnBounds(selection.startColumn, scrollX);

    if (!columnBounds) {
      return;
    }

    const isVisible =
      columnBounds.x + columnBounds.width >= GridConfig.rowHeaderWidth &&
      columnBounds.x <= this.canvas.clientWidth;

    if (!isVisible) {
      return;
    }

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      columnBounds.x,
      GridConfig.columnHeaderHeight,
      columnBounds.width,
      this.canvas.clientHeight - GridConfig.columnHeaderHeight
    );

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      columnBounds.x + 1,
      GridConfig.columnHeaderHeight + 1,
      columnBounds.width - 2,
      this.canvas.clientHeight - GridConfig.columnHeaderHeight - 2
    );

    this.context.lineWidth = 1;
  }

  private drawRangeSelection(
    scrollX: number,
    scrollY: number,
    selection: Selection
  ): void {
    const startRow = Math.min(selection.startRow, selection.endRow);
    const endRow = Math.max(selection.startRow, selection.endRow);
    const startColumn = Math.min(selection.startColumn, selection.endColumn);
    const endColumn = Math.max(selection.startColumn, selection.endColumn);

    const startColumnBounds = this.getColumnBounds(startColumn, scrollX);
    const endColumnBounds = this.getColumnBounds(endColumn, scrollX);
    const startRowBounds = this.getRowBounds(startRow, scrollY);
    const endRowBounds = this.getRowBounds(endRow, scrollY);

    if (
      !startColumnBounds ||
      !endColumnBounds ||
      !startRowBounds ||
      !endRowBounds
    ) {
      return;
    }

    const rangeX = startColumnBounds.x;
    const rangeY = startRowBounds.y;

    const rangeRight = endColumnBounds.x + endColumnBounds.width;
    const rangeBottom = endRowBounds.y + endRowBounds.height;

    const rangeWidth = rangeRight - rangeX;
    const rangeHeight = rangeBottom - rangeY;

    const isVisible =
      rangeX + rangeWidth >= GridConfig.rowHeaderWidth &&
      rangeX <= this.canvas.clientWidth &&
      rangeY + rangeHeight >= GridConfig.columnHeaderHeight &&
      rangeY <= this.canvas.clientHeight;

    if (!isVisible) {
      return;
    }

    const visibleX = Math.max(rangeX, GridConfig.rowHeaderWidth);
    const visibleY = Math.max(rangeY, GridConfig.columnHeaderHeight);

    const visibleRight = Math.min(rangeX + rangeWidth, this.canvas.clientWidth);
    const visibleBottom = Math.min(
      rangeY + rangeHeight,
      this.canvas.clientHeight
    );

    const visibleWidth = visibleRight - visibleX;
    const visibleHeight = visibleBottom - visibleY;

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(visibleX, visibleY, visibleWidth, visibleHeight);

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      visibleX + 1,
      visibleY + 1,
      visibleWidth - 2,
      visibleHeight - 2
    );

    this.context.lineWidth = 1;
  }
}