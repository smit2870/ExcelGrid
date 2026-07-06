import type { GridDataStore } from "../core/GridDataStore";
import type { CoordinateService } from "./CoordinateService";

export class CellEditorService {
    private canvas: HTMLCanvasElement;
    private dataStore: GridDataStore;
    private coordinateService: CoordinateService;
    private cellEditor: HTMLTextAreaElement | null;

    private editingRow: number | null;
    private editingColumn: number | null;

    constructor(
        canvas: HTMLCanvasElement,
        dataStore: GridDataStore,
        coordinateService: CoordinateService,
        cellEditor: HTMLTextAreaElement | null
    ) {
        this.canvas = canvas;
        this.dataStore = dataStore;
        this.coordinateService = coordinateService;
        this.cellEditor = cellEditor;

        this.editingRow = null;
        this.editingColumn = null;
    }

    getEditorElement(): HTMLTextAreaElement | null {
        return this.cellEditor;
    }

    getEditingCell(): { rowIndex: number; columnIndex: number } | null {
        if (this.editingRow === null || this.editingColumn === null) {
            return null;
        }

        return {
            rowIndex: this.editingRow,
            columnIndex: this.editingColumn
        };
    }

    isEditing(): boolean {
        return this.editingRow !== null && this.editingColumn !== null;
    }

    getValue(): string {
        if (!this.cellEditor) {
            return "";
        }

        return this.cellEditor.value;
    }

    show(rowIndex: number, columnIndex: number, scrollX: number, scrollY: number): void {
        if (!this.cellEditor) {
            return;
        }

        const columnBounds = this.coordinateService.getColumnBounds(
            columnIndex,
            scrollX
        );

        const rowBounds = this.coordinateService.getRowBounds(rowIndex, scrollY);

        if (!columnBounds || !rowBounds) {
            return;
        }

        const cellX = columnBounds.x;
        const cellY = rowBounds.y;

        const isVisible =
            cellX + columnBounds.width >= 0 &&
            cellX <= this.canvas.clientWidth &&
            cellY + rowBounds.height >= 0 &&
            cellY <= this.canvas.clientHeight;

        if (!isVisible) {
            return;
        }

        const currentValue = this.dataStore.getCellValue(rowIndex, columnIndex);

        this.editingRow = rowIndex;
        this.editingColumn = columnIndex;

        this.cellEditor.value = currentValue === null ? "" : String(currentValue);

        this.cellEditor.style.display = "block";
        this.cellEditor.style.visibility = "visible";
        this.cellEditor.style.opacity = "1";
        this.cellEditor.style.pointerEvents = "auto";
        this.cellEditor.style.left = `${cellX}px`;
        this.cellEditor.style.top = `${cellY}px`;
        this.cellEditor.style.width = `${columnBounds.width}px`;
        this.cellEditor.style.height = `${rowBounds.height}px`;

        this.cellEditor.focus();
        this.cellEditor.select();
    }

    updatePosition(scrollX: number, scrollY: number): void {
        if (!this.cellEditor) {
            return;
        }

        if (this.editingRow === null || this.editingColumn === null) {
            return;
        }

        const columnBounds = this.coordinateService.getColumnBounds(
            this.editingColumn,
            scrollX
        );

        const rowBounds = this.coordinateService.getRowBounds(
            this.editingRow,
            scrollY
        );

        if (!columnBounds || !rowBounds) {
            return;
        }

        const cellX = columnBounds.x;
        const cellY = rowBounds.y;

        const isVisible =
            cellX + columnBounds.width >= 0 &&
            cellX <= this.canvas.clientWidth &&
            cellY + rowBounds.height >= 0 &&
            cellY <= this.canvas.clientHeight;

        if (!isVisible) {
            this.cellEditor.style.display = "block";
            this.cellEditor.style.visibility = "visible";
            this.cellEditor.style.opacity = "0";
            this.cellEditor.style.pointerEvents = "none";
            return;
        }

        this.cellEditor.style.display = "block";
        this.cellEditor.style.visibility = "visible";
        this.cellEditor.style.opacity = "1";
        this.cellEditor.style.pointerEvents = "auto";
        this.cellEditor.style.left = `${cellX}px`;
        this.cellEditor.style.top = `${cellY}px`;
        this.cellEditor.style.width = `${columnBounds.width}px`;
        this.cellEditor.style.height = `${rowBounds.height}px`;
    }

    hide(): void {
        if (!this.cellEditor) {
            return;
        }

        this.cellEditor.style.display = "none";
        this.cellEditor.style.visibility = "visible";
        this.cellEditor.style.opacity = "1";
        this.cellEditor.style.pointerEvents = "auto";

        this.editingRow = null;
        this.editingColumn = null;
    }

    insertNewLineAtCursor(): void {
        if (!this.cellEditor) {
            return;
        }

        const selectionStart = this.cellEditor.selectionStart;
        const selectionEnd = this.cellEditor.selectionEnd;
        const currentValue = this.cellEditor.value;

        this.cellEditor.value =
            currentValue.substring(0, selectionStart) +
            "\n" +
            currentValue.substring(selectionEnd);

        const newCursorPosition = selectionStart + 1;

        this.cellEditor.setSelectionRange(newCursorPosition, newCursorPosition);
    }
}