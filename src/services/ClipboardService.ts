import type { CellValue, GridDataStore } from "../core/GridDataStore";
import type { Selection } from "../models/Selection";

export class ClipboardService {
    copySelection(selection: Selection | null, dataStore: GridDataStore): string {
        if (!selection) {
            return "";
        }

        const startRow = Math.min(selection.startRow, selection.endRow);
        const endRow = Math.max(selection.startRow, selection.endRow);
        const startColumn = Math.min(selection.startColumn, selection.endColumn);
        const endColumn = Math.max(selection.startColumn, selection.endColumn);

        const rows: string[] = [];

        for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
            const columns: string[] = [];

            for (
                let columnIndex = startColumn;
                columnIndex <= endColumn;
                columnIndex++
            ) {
                const value = dataStore.getCellValue(rowIndex, columnIndex);
                columns.push(this.escapeCellValue(value));
            }

            rows.push(columns.join("\t"));
        }

        return rows.join("\n");
    }

    parseClipboardText(text: string): string[][] {
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = "";
        let isInsideQuotes = false;

        for (let index = 0; index < text.length; index++) {
            const character = text[index];
            const nextCharacter = text[index + 1];

            if (character === '"') {
                if (isInsideQuotes && nextCharacter === '"') {
                    currentCell += '"';
                    index++;
                } else {
                    isInsideQuotes = !isInsideQuotes;
                }

                continue;
            }

            if (character === "\t" && !isInsideQuotes) {
                currentRow.push(currentCell);
                currentCell = "";
                continue;
            }

            if ((character === "\n" || character === "\r") && !isInsideQuotes) {
                if (character === "\r" && nextCharacter === "\n") {
                    index++;
                }

                currentRow.push(currentCell);
                rows.push(currentRow);

                currentRow = [];
                currentCell = "";
                continue;
            }

            currentCell += character;
        }

        currentRow.push(currentCell);
        rows.push(currentRow);

        return rows;
    }

    convertTextToCellValue(text: string): CellValue {
        const trimmedText = text.trim();

        if (trimmedText === "") {
            return null;
        }

        const numericValue = Number(trimmedText);

        if (!Number.isNaN(numericValue)) {
            return numericValue;
        }

        return text;
    }

    private escapeCellValue(value: CellValue): string {
        if (value === null) {
            return "";
        }

        const text = String(value);

        const shouldEscape =
            text.includes("\t") ||
            text.includes("\n") ||
            text.includes("\r") ||
            text.includes('"');

        if (!shouldEscape) {
            return text;
        }

        return `"${text.replace(/"/g, '""')}"`;
    }
}