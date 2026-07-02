import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { CanvasUtils } from "../utils/CanvasUtils";
import type { Selection } from "../models/Selection";

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
    const startColumn = Math.floor(scrollX / GridConfig.defaultColumnWidth);

    const visibleColumnCount =
      Math.ceil(
        (this.canvas.clientWidth - GridConfig.rowHeaderWidth) /
        GridConfig.defaultColumnWidth
      ) + 1;

    this.context.font = GridConfig.headerFont;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    for (
      let columnOffset = 0;
      columnOffset < visibleColumnCount;
      columnOffset++
    ) {
      const columnIndex = startColumn + columnOffset;

      if (columnIndex >= GridConfig.totalColumns) {
        break;
      }

      const x =
        GridConfig.rowHeaderWidth +
        columnOffset * GridConfig.defaultColumnWidth -
        (scrollX % GridConfig.defaultColumnWidth);

      const y = 0;

      this.context.fillStyle = GridConfig.headerBackgroundColor;

      this.context.fillRect(
        x,
        y,
        GridConfig.defaultColumnWidth,
        GridConfig.columnHeaderHeight
      );

      this.context.strokeStyle = GridConfig.gridLineColor;

      this.context.strokeRect(
        x,
        y,
        GridConfig.defaultColumnWidth,
        GridConfig.columnHeaderHeight
      );

      this.context.fillStyle = GridConfig.headerTextColor;

      this.context.fillText(
        CanvasUtils.getColumnName(columnIndex),
        x + GridConfig.defaultColumnWidth / 2,
        y + GridConfig.columnHeaderHeight / 2
      );
    }
  }

  private drawRowHeaders(scrollY: number): void {
    const startRow = Math.floor(scrollY / GridConfig.defaultRowHeight);

    const visibleRowCount =
      Math.ceil(
        (this.canvas.clientHeight - GridConfig.columnHeaderHeight) /
        GridConfig.defaultRowHeight
      ) + 1;

    this.context.font = GridConfig.headerFont;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    for (let rowOffset = 0; rowOffset < visibleRowCount; rowOffset++) {
      const rowIndex = startRow + rowOffset;

      if (rowIndex >= GridConfig.totalRows) {
        break;
      }

      const x = 0;

      const y =
        GridConfig.columnHeaderHeight +
        rowOffset * GridConfig.defaultRowHeight -
        (scrollY % GridConfig.defaultRowHeight);

      this.context.fillStyle = GridConfig.headerBackgroundColor;

      this.context.fillRect(
        x,
        y,
        GridConfig.rowHeaderWidth,
        GridConfig.defaultRowHeight
      );

      this.context.strokeStyle = GridConfig.gridLineColor;

      this.context.strokeRect(
        x,
        y,
        GridConfig.rowHeaderWidth,
        GridConfig.defaultRowHeight
      );

      this.context.fillStyle = GridConfig.headerTextColor;

      this.context.fillText(
        String(rowIndex + 1),
        x + GridConfig.rowHeaderWidth / 2,
        y + GridConfig.defaultRowHeight / 2
      );
    }
  }

  private drawCells(scrollX: number, scrollY: number): void {
    const startRow = Math.floor(scrollY / GridConfig.defaultRowHeight);
    const startColumn = Math.floor(scrollX / GridConfig.defaultColumnWidth);

    const visibleRowCount =
      Math.ceil(
        (this.canvas.clientHeight - GridConfig.columnHeaderHeight) /
        GridConfig.defaultRowHeight
      ) + 1;

    const visibleColumnCount =
      Math.ceil(
        (this.canvas.clientWidth - GridConfig.rowHeaderWidth) /
        GridConfig.defaultColumnWidth
      ) + 1;

    this.context.font = GridConfig.font;
    this.context.textAlign = "left";
    this.context.textBaseline = "middle";

    for (let rowOffset = 0; rowOffset < visibleRowCount; rowOffset++) {
      const rowIndex = startRow + rowOffset;

      if (rowIndex >= GridConfig.totalRows) {
        break;
      }

      const y =
        GridConfig.columnHeaderHeight +
        rowOffset * GridConfig.defaultRowHeight -
        (scrollY % GridConfig.defaultRowHeight);

      for (
        let columnOffset = 0;
        columnOffset < visibleColumnCount;
        columnOffset++
      ) {
        const columnIndex = startColumn + columnOffset;

        if (columnIndex >= GridConfig.totalColumns) {
          break;
        }

        const x =
          GridConfig.rowHeaderWidth +
          columnOffset * GridConfig.defaultColumnWidth -
          (scrollX % GridConfig.defaultColumnWidth);

        const value = this.dataStore.getCellValue(rowIndex, columnIndex);

        if (value !== null) {
          this.context.fillStyle = GridConfig.cellTextColor;

          this.context.fillText(
            String(value),
            x + 6,
            y + GridConfig.defaultRowHeight / 2
          );
        }
      }
    }
  }

  private drawGridLines(scrollX: number, scrollY: number): void {
    const startRow = Math.floor(scrollY / GridConfig.defaultRowHeight);
    const startColumn = Math.floor(scrollX / GridConfig.defaultColumnWidth);

    const visibleRowCount =
      Math.ceil(
        (this.canvas.clientHeight - GridConfig.columnHeaderHeight) /
        GridConfig.defaultRowHeight
      ) + 1;

    const visibleColumnCount =
      Math.ceil(
        (this.canvas.clientWidth - GridConfig.rowHeaderWidth) /
        GridConfig.defaultColumnWidth
      ) + 1;

    this.context.strokeStyle = GridConfig.gridLineColor;
    this.context.lineWidth = 1;

    for (let rowOffset = 0; rowOffset <= visibleRowCount; rowOffset++) {
      const rowIndex = startRow + rowOffset;

      if (rowIndex > GridConfig.totalRows) {
        break;
      }

      const y =
        GridConfig.columnHeaderHeight +
        rowOffset * GridConfig.defaultRowHeight -
        (scrollY % GridConfig.defaultRowHeight);

      this.context.beginPath();
      this.context.moveTo(GridConfig.rowHeaderWidth, y);
      this.context.lineTo(this.canvas.clientWidth, y);
      this.context.stroke();
    }

    for (
      let columnOffset = 0;
      columnOffset <= visibleColumnCount;
      columnOffset++
    ) {
      const columnIndex = startColumn + columnOffset;

      if (columnIndex > GridConfig.totalColumns) {
        break;
      }

      const x =
        GridConfig.rowHeaderWidth +
        columnOffset * GridConfig.defaultColumnWidth -
        (scrollX % GridConfig.defaultColumnWidth);

      this.context.beginPath();
      this.context.moveTo(x, GridConfig.columnHeaderHeight);
      this.context.lineTo(x, this.canvas.clientHeight);
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

  private drawCellSelection(
    scrollX: number,
    scrollY: number,
    selection: Selection
  ): void {
    const selectedRow = selection.startRow;
    const selectedColumn = selection.startColumn;

    const cellX =
      GridConfig.rowHeaderWidth +
      selectedColumn * GridConfig.defaultColumnWidth -
      scrollX;

    const cellY =
      GridConfig.columnHeaderHeight +
      selectedRow * GridConfig.defaultRowHeight -
      scrollY;

    const isVisible =
      cellX + GridConfig.defaultColumnWidth >= GridConfig.rowHeaderWidth &&
      cellX <= this.canvas.clientWidth &&
      cellY + GridConfig.defaultRowHeight >= GridConfig.columnHeaderHeight &&
      cellY <= this.canvas.clientHeight;

    if (!isVisible) {
      return;
    }

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      cellX,
      cellY,
      GridConfig.defaultColumnWidth,
      GridConfig.defaultRowHeight
    );

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      cellX + 1,
      cellY + 1,
      GridConfig.defaultColumnWidth - 2,
      GridConfig.defaultRowHeight - 2
    );

    this.context.lineWidth = 1;
  }

  private drawRowSelection(scrollY: number, selection: Selection): void {
    const selectedRow = selection.startRow;

    const rowY =
      GridConfig.columnHeaderHeight +
      selectedRow * GridConfig.defaultRowHeight -
      scrollY;

    const isVisible =
      rowY + GridConfig.defaultRowHeight >= GridConfig.columnHeaderHeight &&
      rowY <= this.canvas.clientHeight;

    if (!isVisible) {
      return;
    }

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      GridConfig.rowHeaderWidth,
      rowY,
      this.canvas.clientWidth - GridConfig.rowHeaderWidth,
      GridConfig.defaultRowHeight
    );

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      GridConfig.rowHeaderWidth + 1,
      rowY + 1,
      this.canvas.clientWidth - GridConfig.rowHeaderWidth - 2,
      GridConfig.defaultRowHeight - 2
    );

    this.context.lineWidth = 1;
  }

  private drawColumnSelection(scrollX: number, selection: Selection): void {
    const selectedColumn = selection.startColumn;

    const columnX =
      GridConfig.rowHeaderWidth +
      selectedColumn * GridConfig.defaultColumnWidth -
      scrollX;

    const isVisible =
      columnX + GridConfig.defaultColumnWidth >= GridConfig.rowHeaderWidth &&
      columnX <= this.canvas.clientWidth;

    if (!isVisible) {
      return;
    }

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      columnX,
      GridConfig.columnHeaderHeight,
      GridConfig.defaultColumnWidth,
      this.canvas.clientHeight - GridConfig.columnHeaderHeight
    );

    this.context.strokeStyle = GridConfig.selectedCellBorderColor;
    this.context.lineWidth = 2;

    this.context.strokeRect(
      columnX + 1,
      GridConfig.columnHeaderHeight + 1,
      GridConfig.defaultColumnWidth - 2,
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

    const rangeX =
      GridConfig.rowHeaderWidth +
      startColumn * GridConfig.defaultColumnWidth -
      scrollX;

    const rangeY =
      GridConfig.columnHeaderHeight +
      startRow * GridConfig.defaultRowHeight -
      scrollY;

    const rangeWidth =
      (endColumn - startColumn + 1) * GridConfig.defaultColumnWidth;

    const rangeHeight =
      (endRow - startRow + 1) * GridConfig.defaultRowHeight;

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
    const visibleBottom = Math.min(rangeY + rangeHeight, this.canvas.clientHeight);

    const visibleWidth = visibleRight - visibleX;
    const visibleHeight = visibleBottom - visibleY;

    this.context.fillStyle = GridConfig.selectedCellFillColor;

    this.context.fillRect(
      visibleX,
      visibleY,
      visibleWidth,
      visibleHeight
    );

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