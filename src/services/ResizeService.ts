import { GridConfig } from "../core/GridConfig";
import type { GridDataStore } from "../core/GridDataStore";
import type { CommandManager } from "../commands/CommandManager";
import { ResizeColumnCommand } from "../commands/ResizeColumnCommand";
import { ResizeRowCommand } from "../commands/ResizeRowCommand";

export class ResizeService {
    private dataStore: GridDataStore;
    private commandManager: CommandManager;

    private isResizingColumn: boolean;
    private resizingColumnIndex: number | null;
    private resizingStartX: number;
    private resizingStartWidth: number;

    private isResizingRow: boolean;
    private resizingRowIndex: number | null;
    private resizingStartY: number;
    private resizingStartHeight: number;

    constructor(dataStore: GridDataStore, commandManager: CommandManager) {
        this.dataStore = dataStore;
        this.commandManager = commandManager;

        this.isResizingColumn = false;
        this.resizingColumnIndex = null;
        this.resizingStartX = 0;
        this.resizingStartWidth = 0;

        this.isResizingRow = false;
        this.resizingRowIndex = null;
        this.resizingStartY = 0;
        this.resizingStartHeight = 0;
    }

    isColumnResizeActive(): boolean {
        return this.isResizingColumn;
    }

    isRowResizeActive(): boolean {
        return this.isResizingRow;
    }

    isResizeActive(): boolean {
        return this.isResizingColumn || this.isResizingRow;
    }

    startColumnResize(columnIndex: number, mouseX: number): void {
        this.isResizingColumn = true;
        this.resizingColumnIndex = columnIndex;
        this.resizingStartX = mouseX;
        this.resizingStartWidth = this.dataStore.getColumnWidth(columnIndex);
    }

    updateColumnResize(mouseX: number): void {
        if (!this.isResizingColumn || this.resizingColumnIndex === null) {
            return;
        }

        const deltaX = mouseX - this.resizingStartX;

        const newWidth = Math.max(
            GridConfig.minColumnWidth,
            this.resizingStartWidth + deltaX
        );

        this.dataStore.setColumnWidth(this.resizingColumnIndex, newWidth);
    }

    finishColumnResize(): void {
        if (!this.isResizingColumn || this.resizingColumnIndex === null) {
            return;
        }

        const newWidth = this.dataStore.getColumnWidth(this.resizingColumnIndex);
        const oldWidth = this.resizingStartWidth;

        if (newWidth !== oldWidth) {
            const command = new ResizeColumnCommand(
                this.dataStore,
                this.resizingColumnIndex,
                oldWidth,
                newWidth
            );

            this.commandManager.execute(command);
        }

        this.resetColumnResizeState();
    }

    startRowResize(rowIndex: number, mouseY: number): void {
        this.isResizingRow = true;
        this.resizingRowIndex = rowIndex;
        this.resizingStartY = mouseY;
        this.resizingStartHeight = this.dataStore.getRowHeight(rowIndex);
    }

    updateRowResize(mouseY: number): void {
        if (!this.isResizingRow || this.resizingRowIndex === null) {
            return;
        }

        const deltaY = mouseY - this.resizingStartY;

        const newHeight = Math.max(
            GridConfig.minRowHeight,
            this.resizingStartHeight + deltaY
        );

        this.dataStore.setRowHeight(this.resizingRowIndex, newHeight);
    }

    finishRowResize(): void {
        if (!this.isResizingRow || this.resizingRowIndex === null) {
            return;
        }

        const newHeight = this.dataStore.getRowHeight(this.resizingRowIndex);
        const oldHeight = this.resizingStartHeight;

        if (newHeight !== oldHeight) {
            const command = new ResizeRowCommand(
                this.dataStore,
                this.resizingRowIndex,
                oldHeight,
                newHeight
            );

            this.commandManager.execute(command);
        }

        this.resetRowResizeState();
    }

    cancelResize(): void {
        this.resetColumnResizeState();
        this.resetRowResizeState();
    }

    private resetColumnResizeState(): void {
        this.isResizingColumn = false;
        this.resizingColumnIndex = null;
        this.resizingStartX = 0;
        this.resizingStartWidth = 0;
    }

    private resetRowResizeState(): void {
        this.isResizingRow = false;
        this.resizingRowIndex = null;
        this.resizingStartY = 0;
        this.resizingStartHeight = 0;
    }
}