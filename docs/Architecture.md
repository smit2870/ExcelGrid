# Excel Grid Architecture Notes

This document explains the internal architecture of the Excel Grid application, including class responsibilities, data storage, virtual rendering, command handling, selection representation, and summary calculation.

---

## 1. Class Responsibilities

The grid is organized around a core rendering layer, services, managers, event handlers, and command objects. The goal of this architecture is to keep `Grid.ts` as the main orchestration layer while moving specific workflows into focused classes.

---

### `Grid`

`Grid` is the main coordinator of the application.

Responsibilities:

- Creates the core services and managers.
- Initializes the canvas.
- Loads generated data.
- Starts persistence loading.
- Attaches mouse, keyboard, scrollbar, formula bar, import/export, and toolbar events.
- Coordinates rendering through `GridRenderer`.
- Provides shared callback methods to managers.

`Grid` no longer directly owns most interaction logic. Instead, it delegates to managers such as `SelectionManager`, `KeyboardManager`, `ClipboardManager`, and `MouseInteractionManager`.

---

### `GridConfig`

`GridConfig` stores global grid constants.

Responsibilities:

- Total row and column count.
- Default row height and column width.
- Minimum row height and column width.
- Header dimensions.
- Font settings.
- Color settings for grid lines, headers, selected cells, and active borders.

Example responsibilities:

```ts
GridConfig.totalRows
GridConfig.totalColumns
GridConfig.defaultRowHeight
GridConfig.defaultColumnWidth
GridConfig.gridLineColor
GridConfig.selectedCellBorderColor
```

---

### `GridDataStore`

`GridDataStore` is responsible for storing cell values, row heights, and column widths.

Responsibilities:

- Store raw cell values.
- Return raw cell values for editing and formula bar usage.
- Return calculated/display cell values for rendering and summary calculations.
- Store custom row heights.
- Store custom column widths.
- Load generated employee data.
- Serialize and deserialize values for persistence.
- Evaluate formulas through `FormulaService` when display values are requested.

Important distinction:

```text
Raw value     = what user typed
Display value = what the grid shows
```

Example:

```text
Raw value:     =A1+B1
Display value: 30
```

---

### `GridRenderer`

`GridRenderer` draws the visible grid onto the canvas.

Responsibilities:

- Clear the canvas before each render.
- Draw visible cells only.
- Draw row headers.
- Draw column headers.
- Draw selected header states.
- Draw selected range fill and border.
- Use `GridConfig` colors and fonts.
- Display calculated values using `dataStore.getCellDisplayValue()`.

The renderer does not own selection logic, editing logic, or data mutation. It only reads the current state and draws it.

---

### `FormulaService`

`FormulaService` evaluates formula cells.

Responsibilities:

- Detect whether a cell value is a formula.
- Parse cell references such as `A1`, `B2`, and `AA10`.
- Parse ranges such as `A1:A10`.
- Evaluate arithmetic formulas.
- Evaluate supported functions.
- Detect circular references.
- Return spreadsheet-style error values where appropriate.

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

---

### `SelectionService`

`SelectionService` stores the current selection state.

Responsibilities:

- Track the active cell.
- Track selected ranges.
- Track selected rows.
- Track selected columns.
- Clear selection.
- Provide the current selection to renderers, managers, formula bar, and status bar.

It is a state holder, not a UI workflow class.

---

### `SelectionManager`

`SelectionManager` coordinates selection workflows.

Responsibilities:

- Start mouse range selection.
- Update range selection during drag.
- Auto-scroll while selecting with the mouse.
- Select all data.
- Select rows from row headers.
- Select columns from column headers.
- Navigate by name box values like `A1` or `A1:C10`.
- Keep selection-related UI updated.

---

### `KeyboardManager`

`KeyboardManager` handles keyboard shortcut routing.

Responsibilities:

- Arrow key navigation.
- `Shift + Arrow` range selection.
- `Enter` to start editing.
- `Delete` to clear selected cells.
- `Ctrl + A` to select all data.
- `Ctrl + C` copy.
- `Ctrl + X` cut.
- `Ctrl + V` paste.
- `Ctrl + Z` undo.
- `Ctrl + Y` redo.

It does not directly mutate cells. Instead, it delegates to other managers.

---

### `MouseInteractionManager`

`MouseInteractionManager` handles mouse workflows.

Responsibilities:

- Mouse down routing.
- Mouse move routing.
- Mouse up routing.
- Double-click editing behavior.
- Row resize detection.
- Column resize detection.
- Top-left corner click behavior.
- Row header and column header click behavior.
- Delegating cell selection to `SelectionManager`.
- Delegating resizing to `ResizeService`.

---

### `GridScrollManager`

`GridScrollManager` owns scroll state and scrollbar updates.

Responsibilities:

- Store `scrollX` and `scrollY`.
- Handle mouse wheel scrolling.
- Attach custom scrollbars.
- Update custom scrollbar positions.
- Limit scroll bounds.
- Update cell editor position after scroll.
- Provide current scroll state to other managers.

---

### `CellEditingManager`

`CellEditingManager` handles editing workflows.

Responsibilities:

- Start editing selected cell.
- Commit cell editor value.
- Cancel editor behavior through `Escape`.
- Save formula bar value.
- Store raw formula values.
- Create edit commands for undo/redo.
- Trigger persistence after edits.
- Refresh render and selection-dependent UI after edit commits.

---

### `ClipboardManager`

`ClipboardManager` handles copy, cut, paste, and delete workflows.

Responsibilities:

- Copy selected cells as raw values.
- Preserve formulas during copy.
- Cut selected cells.
- Paste tab-separated clipboard data.
- Clear selected cells.
- Create paste and clear commands for undo/redo.
- Trigger persistence after changes.

---

### `PersistenceManager`

`PersistenceManager` coordinates saving, loading, importing, and exporting grid state.

Responsibilities:

- Load grid state from IndexedDB.
- Save grid state into IndexedDB.
- Clear saved IndexedDB data.
- Export grid state as JSON.
- Import grid state from JSON.
- Apply persisted cells, row heights, and column widths.

---

### `UndoRedoManager`

`UndoRedoManager` coordinates undo and redo workflows.

Responsibilities:

- Commit active editor before undo/redo.
- Execute undo through `CommandManager`.
- Execute redo through `CommandManager`.
- Trigger persistence after undo/redo.
- Refresh grid rendering.
- Refresh status bar, formula bar, cell editor position, and scrollbars.

---

### `CommandManager`

`CommandManager` stores executed commands and manages undo/redo stacks.

Responsibilities:

- Execute commands.
- Push executed commands onto the undo stack.
- Move undone commands to the redo stack.
- Re-execute redo commands.
- Clear redo stack after a new command is executed.

---

### Command Classes

Command classes represent reversible grid changes.

Examples:

```text
EditCellCommand
ClearCellsCommand
PasteCellsCommand
ResizeColumnCommand
ResizeRowCommand
```

Each command is responsible for implementing:

```ts
execute(): void
undo(): void
```

Some commands may also support redo by simply calling `execute()` again.

---

## 2. Data Storage Approach

The grid is designed to support a very large number of rows and columns without storing every possible cell.

Current grid size:

```text
Rows:    GridConfig.totalRows
Columns: GridConfig.totalColumns
```

Example configuration:

```text
100,000 rows
500 columns
```

A full dense matrix would be very expensive. Instead, the grid uses a sparse storage model.

---

### Cell Storage

Cells are stored in a `Map`.

Conceptually:

```ts
Map<string, string | number>
```

The key is created from row and column indexes:

```ts
`${rowIndex}:${columnIndex}`
```

Example:

```text
A1 -> rowIndex 0, columnIndex 0 -> key "0:0"
B1 -> rowIndex 0, columnIndex 1 -> key "0:1"
A2 -> rowIndex 1, columnIndex 0 -> key "1:0"
```

Only cells that contain values are stored.

Empty cells are not stored.

---

### Raw Values and Display Values

The grid stores raw values.

Examples:

```text
10
Hello
=A1+B1
=SUM(A1:A10)
```

When the renderer or status bar needs a value, it asks the data store for the display value.

```ts
getCellRawValue(rowIndex, columnIndex)
getCellDisplayValue(rowIndex, columnIndex)
```

Raw value is used by:

```text
Formula bar
Cell editor
Clipboard copy
Persistence
JSON export
```

Display value is used by:

```text
Grid renderer
Status bar calculations
```

---

### Row Heights

Custom row heights are stored sparsely in a `Map`.

Conceptually:

```ts
Map<number, number>
```

Only rows with a custom height are stored.

If a row does not exist in the map, the grid uses:

```ts
GridConfig.defaultRowHeight
```

---

### Column Widths

Custom column widths are stored sparsely in a `Map`.

Conceptually:

```ts
Map<number, number>
```

Only columns with a custom width are stored.

If a column does not exist in the map, the grid uses:

```ts
GridConfig.defaultColumnWidth
```

---

### Persistence Format

The grid serializes only meaningful state:

```text
Changed/non-empty cells
Custom row heights
Custom column widths
```

Example persisted state:

```ts
{
  cells: [
    {
      rowIndex: 0,
      columnIndex: 2,
      value: "=A1+B1"
    }
  ],
  rowHeights: [
    {
      rowIndex: 4,
      height: 40
    }
  ],
  columnWidths: [
    {
      columnIndex: 1,
      width: 160
    }
  ]
}
```

---

## 3. Virtual Rendering Approach

The grid does not draw all rows and columns. It only draws the visible portion of the grid.

This is essential because the grid can contain:

```text
100,000 rows
500 columns
```

Rendering every cell would be too slow.

---

### Visible Column Calculation

The renderer calculates visible columns using:

```text
scrollX
canvas width
row header width
column widths
```

It starts from the left side of the grid and accumulates column widths until the visible viewport is filled.

Only columns that intersect the canvas viewport are added to the visible column list.

Conceptually:

```ts
if (columnRight >= rowHeaderWidth && columnLeft <= canvasWidth) {
  drawColumn();
}
```

---

### Visible Row Calculation

The renderer calculates visible rows using:

```text
scrollY
canvas height
column header height
row heights
```

It starts from the top of the grid and accumulates row heights until the visible viewport is filled.

Only rows that intersect the canvas viewport are added to the visible row list.

Conceptually:

```ts
if (rowBottom >= columnHeaderHeight && rowTop <= canvasHeight) {
  drawRow();
}
```

---

### Drawing Process

Each render performs these steps:

```text
1. Clear canvas
2. Draw visible grid cells
3. Draw visible column headers
4. Draw visible row headers
5. Draw top-left corner
6. Draw current selection
```

Only visible cells are drawn.

This keeps rendering fast even when the logical grid is very large.

---

### Scroll Offset

The grid uses scroll offsets:

```ts
scrollX
scrollY
```

These offsets shift the calculated cell positions.

Example:

```ts
let x = GridConfig.rowHeaderWidth - scrollX;
let y = GridConfig.columnHeaderHeight - scrollY;
```

This gives the effect of scrolling through a large grid while only drawing the viewport.

---

## 4. Command Pattern Approach

The grid uses the command pattern for reversible actions.

Each user action that changes grid state is wrapped in a command object.

Examples:

```text
Edit cell
Clear cells
Paste cells
Resize row
Resize column
```

---

### Command Interface Concept

Each command follows this concept:

```ts
execute(): void
undo(): void
```

`execute()` applies the change.

`undo()` reverses the change.

---

### Execute Flow

When a command is executed:

```text
1. CommandManager receives the command.
2. CommandManager calls command.execute().
3. Command is pushed onto the undo stack.
4. Redo stack is cleared.
5. Grid is re-rendered.
6. Persistence is scheduled or saved.
```

---

### Undo Flow

When undo is triggered:

```text
1. UndoRedoManager commits active editor if needed.
2. CommandManager pops the last command from undo stack.
3. CommandManager calls command.undo().
4. Command is pushed onto redo stack.
5. Grid is re-rendered.
6. UI and persistence are updated.
```

---

### Redo Flow

When redo is triggered:

```text
1. UndoRedoManager commits active editor if needed.
2. CommandManager pops the last command from redo stack.
3. CommandManager calls command.execute().
4. Command is pushed back onto undo stack.
5. Grid is re-rendered.
6. UI and persistence are updated.
```

---

### Example: Edit Cell Command

An edit command stores:

```text
row index
column index
old value
new value
```

Execute:

```text
Set cell to new value
```

Undo:

```text
Restore old value
```

---

### Example: Paste Cells Command

A paste command stores a list of changed cells.

Each pasted cell records:

```text
row index
column index
old value
new value
```

Execute:

```text
Apply all new values
```

Undo:

```text
Restore all old values
```

---

## 5. Selection Model

The grid represents selection using a selection object.

A selection generally contains:

```ts
type
startRow
startColumn
endRow
endColumn
```

The start and end values allow the same structure to represent a single cell, a rectangular range, a row, or a column.

---

### Single Cell Selection

A single selected cell is represented by identical start and end positions.

Example: `A1`

```ts
{
  type: "cell",
  startRow: 0,
  startColumn: 0,
  endRow: 0,
  endColumn: 0
}
```

---

### Range Selection

A range selection uses different start and end positions.

Example: `A1:C5`

```ts
{
  type: "range",
  startRow: 0,
  startColumn: 0,
  endRow: 4,
  endColumn: 2
}
```

The renderer normalizes the range using:

```ts
Math.min(selection.startRow, selection.endRow)
Math.max(selection.startRow, selection.endRow)
Math.min(selection.startColumn, selection.endColumn)
Math.max(selection.startColumn, selection.endColumn)
```

This allows dragging in any direction.

---

### Row Selection

A row selection uses the selected row as the row range and all columns as the column range.

Example: row 5

```ts
{
  type: "row",
  startRow: 4,
  endRow: 4,
  startColumn: 0,
  endColumn: GridConfig.totalColumns - 1
}
```

---

### Column Selection

A column selection uses the selected column as the column range and all rows as the row range.

Example: column C

```ts
{
  type: "column",
  startRow: 0,
  endRow: GridConfig.totalRows - 1,
  startColumn: 2,
  endColumn: 2
}
```

---

### Active Cell

The active cell is usually represented by:

```text
selection.startRow
selection.startColumn
```

The active cell is used by:

```text
Formula bar
Name box
Cell editor
Keyboard navigation
Paste start location
```

---

## 6. Summary Calculation

The status bar calculates summary values for the selected range.

Supported summary values:

```text
Count
Sum
Average
Minimum
Maximum
```

---

### Avoiding Full-Grid Processing

The summary calculation does not scan the entire theoretical grid of all rows and columns.

Instead, it iterates through the sparse stored cells only.

That means it processes cells that actually contain values.

Conceptually:

```ts
dataStore.forEachCell((rowIndex, columnIndex) => {
  if (cellIsInsideSelection) {
    processValue();
  }
});
```

This avoids unnecessary processing of empty cells.

---

### Selection Boundary Check

The status bar first calculates normalized selection boundaries:

```ts
startRow
endRow
startColumn
endColumn
```

Then each stored cell is checked against those boundaries.

```ts
const isInsideSelection =
  rowIndex >= startRow &&
  rowIndex <= endRow &&
  columnIndex >= startColumn &&
  columnIndex <= endColumn;
```

Only cells inside the selected range are included.

---

### Formula-Aware Summary

Summary calculation uses display values instead of raw values.

This means formulas are calculated before being included in the summary.

Example:

```text
A1 = 10
B1 = 20
C1 = =A1+B1
```

If `C1` is selected, the status bar uses:

```text
30
```

not:

```text
=A1+B1
```

---

### Average Calculation

Average is calculated after the loop:

```ts
average = count === 0 ? null : sum / count
```

If there are no numeric values, the status bar displays:

```text
Avg: -
Min: -
Max: -
```

---

---

## 7. Interaction State Design Pattern

Mouse interaction routing now follows the State design pattern. `MouseInteractionManager` acts as the context and delegates mouse events to the active interaction state instead of checking multiple resize and selection flags in every handler.

The interaction states are:

```text
IdleInteractionState
SelectingInteractionState
ColumnResizeInteractionState
RowResizeInteractionState
DisposedInteractionState
```

### State responsibilities

- `IdleInteractionState` detects resize borders, updates hover cursors, handles row and column header selection, clears selection from the top-left corner, starts range selection, and handles cell double-click editing.
- `SelectingInteractionState` updates the selected range during mouse movement and returns to idle after mouse release.
- `ColumnResizeInteractionState` updates column width while dragging, completes the resize command on mouse release, refreshes the resize UI, saves state, and returns to idle.
- `RowResizeInteractionState` performs the equivalent workflow for row height.
- `DisposedInteractionState` ignores further interaction after the grid is disposed.

### State transitions

```text
Idle
  -> Selecting on cell mouse down
  -> Column Resizing on column-border mouse down
  -> Row Resizing on row-border mouse down
  -> Disposed when the grid is disposed

Selecting
  -> Idle on mouse up

Column Resizing
  -> Idle on mouse up

Row Resizing
  -> Idle on mouse up
```

The state classes do not reimplement selection or resizing calculations. They delegate to the existing `SelectionManager`, `ResizeService`, `GridScrollManager`, and application callbacks. This keeps the behavior unchanged while making interaction modes and transitions explicit.


