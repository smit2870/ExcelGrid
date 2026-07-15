# Excel Grid

A high-performance, canvas-based Excel-like grid built with TypeScript. The project supports large datasets, spreadsheet-style selection, editing, formulas, undo/redo, persistence, JSON import/export, and virtual rendering.

---

## Objective

The objective of this project is to build an Excel-like grid that can handle large numbers of rows and columns efficiently while keeping the codebase clean, modular, and maintainable.

The application demonstrates:

- Canvas-based virtual rendering
- Sparse data storage
- Cell editing and formula support
- Mouse and keyboard interactions
- Undo/redo using command pattern
- IndexedDB persistence
- JSON import/export
- Manager-based architecture

---
## Tech Stack

- TypeScript
- HTML
- CSS
- HTML Canvas
- Vite

---

## How to Install and Run

### Prerequisites

Make sure the following are installed:

```bash
node --version
npm --version
```

Recommended:

```text
Node.js 18+
npm 9+
```

### Installation

Clone the repository:

```bash
git clone https://github.com/smit2870/ExcelGrid.git
cd ExcelGrid
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open the local Vite URL shown in the terminal, usually:

```text
http://localhost:5173/
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```text
ExcelGrid/
│
├── docs/
│   ├── Architecture.md
│   ├── OOPsPrinciples.md
│   ├── Summary.md
│   └── Testing.md
├── src/
│   ├── commands/
│   │   ├── CommandManager.ts
│   │   ├── ICommand.ts
│   │   ├── EditCellCommand.ts
│   │   ├── ClearCellsCommand.ts
│   │   ├── PasteCellsCommand.ts
│   │   ├── ResizeColumnCommand.ts
│   │   └── ResizeRowCommand.ts
│   ├── core/
│   │   ├── Grid.ts
│   │   ├── GridConfig.ts
│   │   ├── GridDataStore.ts
│   │   └── GridRenderer.ts
│   ├── events/
│   │   ├── KeyboardHandler.ts
│   │   └── MouseHandler.ts
│   ├── managers/
│   │   ├── CellEditingManager.ts
│   │   ├── ClipboardManager.ts
│   │   ├── GridScrollManager.ts
│   │   ├── KeyboardManager.ts
│   │   ├── MouseInteractionManager.ts
│   │   ├── PersistenceManager.ts
│   │   ├── SelectionManager.ts
│   │   └── UndoRedoManager.ts
│   ├── models/
│   │   └── Selection.ts
│   ├── services/
│   │   ├── CellEditorService.ts
│   │   ├── ClipboardService.ts
│   │   ├── CoordinateService.ts
│   │   ├── DataGenerator.ts
│   │   ├── FormulaBarService.ts
│   │   ├── FormulaService.ts
│   │   ├── ImportExportService.ts
│   │   ├── KeyboardNavigationService.ts
│   │   ├── PersistenceService.ts
│   │   ├── ResizeService.ts
│   │   ├── ScrollBarService.ts
│   │   ├── SelectionService.ts
│   │   ├── SelectionStatisticsService.ts
│   │   └── StatusBarService.ts
│   ├── utils/
│   │   └── CanvasUtils.ts
│   ├── main.ts
│   └── style.css
├── index.html
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore
```

---

## Features Implemented

### Grid and Rendering

- Canvas-based grid rendering
- Virtual rendering of visible rows and columns only
- Large grid support
- Row headers and column headers
- Custom row heights
- Custom column widths
- Centralized visual styles through `GridConfig`

### Selection

- Single-cell selection
- Range selection
- Row selection
- Column selection
- Select all with `Ctrl + A`
- Mouse drag range selection
- Auto-scroll while selecting with mouse
- Keyboard selection with arrow keys and `Shift + Arrow`

### Editing

- Double-click cell editing
- `Enter` to start editing
- `Enter` to commit editing
- `Escape` to cancel editing
- `Alt + Enter` for multiline editing
- Formula bar editing
- Name box navigation

### Formula Support

Supported formulas include:

```text
=A1+B1
=A1-B1
=A1*B1
=A1/B1
=SUM(A1:A10)
=AVG(A1:A10)
=MIN(A1:A10)
=MAX(A1:A10)
=COUNT(A1:A10)
```

Formula behavior:

- Raw formula is stored in the cell
- Calculated value is displayed in the grid
- Formula bar shows raw formula text
- Status bar uses calculated formula values

### Clipboard

- Copy selected cells
- Cut selected cells
- Paste tabular data
- Delete selected cells
- Formula cells copy raw formula values

### Undo / Redo

- Undo and redo cell edits
- Undo and redo clear/delete operations
- Undo and redo paste operations
- Undo and redo row resize operations
- Undo and redo column resize operations

### Persistence and Import/Export

- IndexedDB persistence
- Cell values persist after refresh
- Formula values persist after refresh
- Row heights persist after refresh
- Column widths persist after refresh
- JSON export
- JSON import
- Clear saved data action

### Lifecycle Management

- Supports safe grid disposal by removing event listeners, cancelling timers and animation frames, and preventing duplicate handlers or memory leaks when the grid is recreated.

---


## Documentation

Additional documentation is available in the `docs` folder.

### Project Summary

```text
docs/Summary.md
```

Contains a high-level summary of completed features, refactoring work, persistence support, formula support, and future improvements.

### Architecture Notes

```text
docs/Architecture.md
```

Explains class responsibilities, data storage approach, virtual rendering, command pattern usage, selection model, and summary calculations.

### OOP and SOLID Design Notes

```text
docs/OOPsPrinciples.md
```

Explains how object-oriented programming concepts and SOLID principles are applied in this project.

### Testing Expectations

```text
docs/Testing.md
```

Contains 40 executable manual test scenarios covering editing, resizing, selection, summary calculation, data loading, performance, keyboard behavior, formula behavior, persistence, import/export, and error handling.

---

## Performance Notes

- The grid uses virtual rendering and only draws visible rows and columns.
- Cell data is stored sparsely, so empty cells are not stored.
- Keyboard navigation rendering is optimized with `requestAnimationFrame`.
- Summary calculations are incremental and avoid large array spreading.
- Selection status updates are debounced during large or repeated selection changes.

---

## Known Limitations

- Formula support currently covers basic arithmetic and simple aggregate functions only.
- Formula copy/paste preserves raw formulas but does not yet adjust references relatively.
- Undo/redo history is session-based and is not persisted after refresh.
- IndexedDB persistence currently stores the current grid state, not command history.

---

## Suggested Future Improvements

- Relative formula paste
- More formulas such as `IF`, `ROUND`, `ABS`, `CONCAT`, `LEFT`, and `RIGHT`
- Sorting and filtering
- Freeze rows/columns
- Auto-fit rows and columns
- Fill handle
- Cell formatting
- Number formatting
- Context menu
- Debounced or incremental IndexedDB saves
- Improved accessibility support

---

The project is structured to be extensible, testable, and ready for future spreadsheet features.