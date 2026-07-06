import { GridConfig } from "../core/GridConfig";
import type { GridDataStore } from "../core/GridDataStore";

export class CoordinateService {
    private canvas: HTMLCanvasElement;
    private dataStore: GridDataStore;

    constructor(canvas: HTMLCanvasElement, dataStore: GridDataStore) {
        this.canvas = canvas;
        this.dataStore = dataStore;
    }

    getColumnResizeIndex(
        mouseX: number,
        mouseY: number,
        scrollX: number
    ): number | null {
        if (mouseY > GridConfig.columnHeaderHeight) {
            return null;
        }

        if (mouseX < GridConfig.rowHeaderWidth) {
            return null;
        }

        const resizeThreshold = 5;
        let currentX = GridConfig.rowHeaderWidth - scrollX;

        for (
            let columnIndex = 0;
            columnIndex < GridConfig.totalColumns;
            columnIndex++
        ) {
            const columnWidth = this.dataStore.getColumnWidth(columnIndex);
            const columnRightEdge = currentX + columnWidth;

            if (Math.abs(mouseX - columnRightEdge) <= resizeThreshold) {
                return columnIndex;
            }

            currentX += columnWidth;

            if (currentX > this.canvas.clientWidth + resizeThreshold) {
                break;
            }
        }

        return null;
    }

    getRowResizeIndex(
        mouseX: number,
        mouseY: number,
        scrollY: number
    ): number | null {
        if (mouseX > GridConfig.rowHeaderWidth) {
            return null;
        }

        if (mouseY < GridConfig.columnHeaderHeight) {
            return null;
        }

        const resizeThreshold = 5;
        let currentY = GridConfig.columnHeaderHeight - scrollY;

        for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
            const rowHeight = this.dataStore.getRowHeight(rowIndex);
            const rowBottomEdge = currentY + rowHeight;

            if (Math.abs(mouseY - rowBottomEdge) <= resizeThreshold) {
                return rowIndex;
            }

            currentY += rowHeight;

            if (currentY > this.canvas.clientHeight + resizeThreshold) {
                break;
            }
        }

        return null;
    }

    getColumnIndexFromMouseX(mouseX: number, scrollX: number): number | null {
        if (mouseX < GridConfig.rowHeaderWidth) {
            return null;
        }

        let currentX = GridConfig.rowHeaderWidth - scrollX;

        for (
            let columnIndex = 0;
            columnIndex < GridConfig.totalColumns;
            columnIndex++
        ) {
            const columnWidth = this.dataStore.getColumnWidth(columnIndex);

            if (mouseX >= currentX && mouseX <= currentX + columnWidth) {
                return columnIndex;
            }

            currentX += columnWidth;

            if (currentX > this.canvas.clientWidth) {
                break;
            }
        }

        return null;
    }

    getRowIndexFromMouseY(mouseY: number, scrollY: number): number | null {
        if (mouseY < GridConfig.columnHeaderHeight) {
            return null;
        }

        let currentY = GridConfig.columnHeaderHeight - scrollY;

        for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
            const rowHeight = this.dataStore.getRowHeight(rowIndex);

            if (mouseY >= currentY && mouseY <= currentY + rowHeight) {
                return rowIndex;
            }

            currentY += rowHeight;

            if (currentY > this.canvas.clientHeight) {
                break;
            }
        }

        return null;
    }

    getColumnBounds(
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

    getRowBounds(
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

    getTotalColumnsWidth(): number {
        let totalWidth = 0;

        for (
            let columnIndex = 0;
            columnIndex < GridConfig.totalColumns;
            columnIndex++
        ) {
            totalWidth += this.dataStore.getColumnWidth(columnIndex);
        }

        return totalWidth;
    }

    getTotalRowsHeight(): number {
        let totalHeight = 0;

        for (let rowIndex = 0; rowIndex < GridConfig.totalRows; rowIndex++) {
            totalHeight += this.dataStore.getRowHeight(rowIndex);
        }

        return totalHeight;
    }
}
