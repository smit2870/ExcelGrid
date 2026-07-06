import { GridConfig } from "../core/GridConfig";
import type { Selection } from "../models/Selection";
import type { SelectionService } from "./SelectionService";
import type { CoordinateService } from "./CoordinateService";

export interface KeyboardNavigationResult {
    rowIndex: number;
    columnIndex: number;
    scrollX: number;
    scrollY: number;
}

export class KeyboardNavigationService {
    private canvas: HTMLCanvasElement;
    private selectionService: SelectionService;
    private coordinateService: CoordinateService;

    constructor(
        canvas: HTMLCanvasElement,
        selectionService: SelectionService,
        coordinateService: CoordinateService
    ) {
        this.canvas = canvas;
        this.selectionService = selectionService;
        this.coordinateService = coordinateService;
    }

    moveSelectedCell(
        rowDelta: number,
        columnDelta: number,
        scrollX: number,
        scrollY: number
    ): KeyboardNavigationResult {
        const selection = this.selectionService.getSelection();

        const currentCell = this.getBaseCellFromSelection(selection);

        const nextRow = Math.max(
            0,
            Math.min(GridConfig.totalRows - 1, currentCell.rowIndex + rowDelta)
        );

        const nextColumn = Math.max(
            0,
            Math.min(
                GridConfig.totalColumns - 1,
                currentCell.columnIndex + columnDelta
            )
        );

        this.selectionService.setCellSelection(nextRow, nextColumn);

        const updatedScroll = this.ensureCellVisible(
            nextRow,
            nextColumn,
            scrollX,
            scrollY
        );

        return {
            rowIndex: nextRow,
            columnIndex: nextColumn,
            scrollX: updatedScroll.scrollX,
            scrollY: updatedScroll.scrollY
        };
    }

    prepareSelectedCellForEditing(
        scrollX: number,
        scrollY: number
    ): KeyboardNavigationResult {
        const selection = this.selectionService.getSelection();

        const selectedCell = this.getBaseCellFromSelection(selection);

        this.selectionService.setCellSelection(
            selectedCell.rowIndex,
            selectedCell.columnIndex
        );

        const updatedScroll = this.ensureCellVisible(
            selectedCell.rowIndex,
            selectedCell.columnIndex,
            scrollX,
            scrollY
        );

        return {
            rowIndex: selectedCell.rowIndex,
            columnIndex: selectedCell.columnIndex,
            scrollX: updatedScroll.scrollX,
            scrollY: updatedScroll.scrollY
        };
    }

    ensureCellVisible(
        rowIndex: number,
        columnIndex: number,
        scrollX: number,
        scrollY: number
    ): { scrollX: number; scrollY: number } {
        const columnBounds = this.coordinateService.getColumnBounds(
            columnIndex,
            scrollX
        );

        const rowBounds = this.coordinateService.getRowBounds(rowIndex, scrollY);

        let updatedScrollX = scrollX;
        let updatedScrollY = scrollY;

        if (!columnBounds || !rowBounds) {
            return {
                scrollX: updatedScrollX,
                scrollY: updatedScrollY
            };
        }

        if (columnBounds.x < GridConfig.rowHeaderWidth) {
            updatedScrollX -= GridConfig.rowHeaderWidth - columnBounds.x;
        }

        if (columnBounds.x + columnBounds.width > this.canvas.clientWidth) {
            updatedScrollX +=
                columnBounds.x + columnBounds.width - this.canvas.clientWidth;
        }

        if (rowBounds.y < GridConfig.columnHeaderHeight) {
            updatedScrollY -= GridConfig.columnHeaderHeight - rowBounds.y;
        }

        if (rowBounds.y + rowBounds.height > this.canvas.clientHeight) {
            updatedScrollY += rowBounds.y + rowBounds.height - this.canvas.clientHeight;
        }

        return {
            scrollX: updatedScrollX,
            scrollY: updatedScrollY
        };
    }

    private getBaseCellFromSelection(
        selection: Selection | null
    ): { rowIndex: number; columnIndex: number } {
        if (!selection) {
            return {
                rowIndex: 0,
                columnIndex: 0
            };
        }

        return {
            rowIndex: selection.startRow,
            columnIndex: selection.startColumn
        };
    }
}