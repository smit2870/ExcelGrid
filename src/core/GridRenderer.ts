import { GridConfig } from "./GridConfig";
import { GridDataStore } from "./GridDataStore";
import { CanvasUtils } from "../utils/CanvasUtils";

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

  render(scrollX: number, scrollY: number): void {
    this.clearCanvas();

    this.drawBackground();
    this.drawColumnHeaders(scrollX);
    this.drawRowHeaders(scrollY);
    this.drawCells(scrollX, scrollY);
    this.drawGridLines(scrollX, scrollY);
    this.drawTopLeftCorner();
  }

  private clearCanvas(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(): void {
    this.context.fillStyle = "#ffffff";
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
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

    for (let columnOffset = 0;columnOffset < visibleColumnCount;columnOffset++) {
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

      for (let columnOffset = 0; columnOffset < visibleColumnCount; columnOffset++) {
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

    for (let columnOffset = 0; columnOffset <= visibleColumnCount; columnOffset++) {
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
}