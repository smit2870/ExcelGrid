import type { CellValue } from "../core/GridDataStore";

export interface SerializedCell {
  rowIndex: number;
  columnIndex: number;
  value: CellValue;
}

export interface SerializedRowHeight {
  rowIndex: number;
  height: number;
}

export interface SerializedColumnWidth {
  columnIndex: number;
  width: number;
}

export interface GridPersistenceState {
  cells: SerializedCell[];
  rowHeights: SerializedRowHeight[];
  columnWidths: SerializedColumnWidth[];
}

export class PersistenceService {
  private databaseName: string;
  private storeName: string;
  private stateKey: string;

  constructor(
    databaseName: string = "excel-grid-database",
    storeName: string = "grid-state",
    stateKey: string = "current-state"
  ) {
    this.databaseName = databaseName;
    this.storeName = storeName;
    this.stateKey = stateKey;
  }

  async save(state: GridPersistenceState): Promise<void> {
    try {
      const database = await this.openDatabase();

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);

        store.put(state, this.stateKey);

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error("Failed to save grid state in IndexedDB.", error);
    }
  }

  async load(): Promise<GridPersistenceState | null> {
    try {
      const database = await this.openDatabase();

      return await new Promise<GridPersistenceState | null>(
        (resolve, reject) => {
          const transaction = database.transaction(this.storeName, "readonly");
          const store = transaction.objectStore(this.storeName);
          const request = store.get(this.stateKey);

          request.onsuccess = () => {
            database.close();
            resolve((request.result as GridPersistenceState) ?? null);
          };

          request.onerror = () => {
            database.close();
            reject(request.error);
          };
        }
      );
    } catch (error) {
      console.error("Failed to load grid state from IndexedDB.", error);
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      const database = await this.openDatabase();

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);

        store.delete(this.stateKey);

        transaction.oncomplete = () => {
          database.close();
          resolve();
        };

        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error("Failed to clear grid state from IndexedDB.", error);
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}