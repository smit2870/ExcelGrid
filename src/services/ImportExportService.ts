import type { GridPersistenceState } from "./PersistenceService";

export class ImportExportService {
  exportState(state: GridPersistenceState): void {
    const serializedState = JSON.stringify(state, null, 2);
    const blob = new Blob([serializedState], {
      type: "application/json"
    });

    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = this.getExportFileName();

    document.body.appendChild(anchor);
    anchor.click();

    document.body.removeChild(anchor);
    URL.revokeObjectURL(objectUrl);
  }

  async importState(file: File): Promise<GridPersistenceState | null> {
    try {
      const fileText = await file.text();
      const parsedState = JSON.parse(fileText) as GridPersistenceState;

      if (!this.isValidGridState(parsedState)) {
        console.error("Invalid grid JSON file.");
        return null;
      }

      return parsedState;
    } catch (error) {
      console.error("Failed to import grid JSON file.", error);
      return null;
    }
  }

  private getExportFileName(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `grid-export-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.json`;
  }

  private isValidGridState(value: unknown): value is GridPersistenceState {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const state = value as GridPersistenceState;

    return (
      Array.isArray(state.cells) &&
      Array.isArray(state.rowHeights) &&
      Array.isArray(state.columnWidths)
    );
  }
}