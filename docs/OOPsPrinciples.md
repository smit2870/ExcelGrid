# OOP and SOLID Design Notes

This document explains how object-oriented programming concepts and SOLID principles are applied in the Excel Grid project.

---

## Object-Oriented Programming Concepts

The project uses object-oriented programming to separate responsibilities into focused classes. Instead of keeping all logic inside one large file, the application is divided into core classes, services, managers, commands, and event handlers.

---

## Encapsulation

Encapsulation means each class owns and protects its own internal state and behavior.

### Examples

#### `GridDataStore`

`GridDataStore` hides how cell values, row heights, and column widths are stored.

Other classes do not directly access the internal maps. They use methods such as:

```ts
getCellRawValue(rowIndex, columnIndex)
getCellDisplayValue(rowIndex, columnIndex)
setCellValue(rowIndex, columnIndex, value)
getRowHeight(rowIndex)
getColumnWidth(columnIndex)
```

This keeps storage logic centralized.

#### `GridScrollManager`

`GridScrollManager` owns scroll state.

It hides:

```text
scrollX
scrollY
scrollbar updates
scroll limits
cell editor position updates
```

Other classes request or update scroll position through methods instead of directly mutating scroll variables.

#### `FormulaService`

`FormulaService` hides formula parsing and evaluation logic.

Other classes do not need to know how formulas are parsed. They only request display values through the data store.

---

## Abstraction

Abstraction means exposing simple public methods while hiding complex internal implementation.

### Examples

From `Grid.ts`, workflow calls are high-level:

```ts
this.selectionManager.selectAllData();
this.clipboardManager.pasteCellsFromClipboard();
this.undoRedoManager.undo();
this.persistenceManager.exportGridData();
```

The `Grid` class does not need to know every detail of how selection, paste, undo, or export works.

---

## Composition

Composition means building complex behavior by combining smaller focused objects.

The `Grid` class is composed of many objects:

```text
GridDataStore
GridRenderer
SelectionManager
ClipboardManager
PersistenceManager
CellEditingManager
UndoRedoManager
KeyboardManager
GridScrollManager
MouseInteractionManager
```

This avoids a single large class with too many responsibilities.

---

## Polymorphism Through Commands

The command pattern provides polymorphism-like behavior.

Different command classes expose the same shape:

```ts
execute(): void
undo(): void
```

Examples:

```text
EditCellCommand
ClearCellsCommand
PasteCellsCommand
ResizeColumnCommand
ResizeRowCommand
```

`CommandManager` can execute and undo any command without knowing the command's internal details.

---

## SOLID Principles

---

## Single Responsibility Principle

A class should have one main reason to change.

### Applied Examples

#### `GridRenderer`

Responsible only for drawing the grid.

It does not handle:

```text
selection logic
editing logic
clipboard logic
persistence logic
```

#### `ClipboardManager`

Responsible only for clipboard workflows:

```text
copy
cut
paste
clear selected cells
```

#### `PersistenceManager`

Responsible only for:

```text
IndexedDB load/save
JSON import/export
clear saved data
```

#### `FormulaService`

Responsible only for formula detection and evaluation.

---

## Open/Closed Principle

Classes should be open for extension but closed for modification.

### Applied Examples

#### Commands

New reversible actions can be added by creating new command classes without changing `CommandManager`.

Example future commands:

```text
SortCommand
FilterCommand
FormatCellCommand
FillRangeCommand
```

#### FormulaService

New formulas can be added by extending formula handling logic.

Example future functions:

```text
IF
ROUND
ABS
CONCAT
LEFT
RIGHT
```

#### Managers

New features can be added as new managers instead of expanding `Grid.ts` heavily.

Example future managers:

```text
FilterManager
SortManager
FormattingManager
```

---

## Liskov Substitution Principle

Objects with the same expected behavior should be replaceable.

### Applied Example

All command objects follow the same expected behavior:

```ts
execute(): void
undo(): void
```

Because of this, `CommandManager` can handle different command types consistently.

It can work with:

```text
EditCellCommand
PasteCellsCommand
ResizeColumnCommand
ResizeRowCommand
```

without needing special handling for each command in the manager itself.

---

## Interface Segregation Principle

Classes should not be forced to depend on methods they do not use.

### Applied Examples

Managers receive only the callbacks and services they need.

For example, `KeyboardManager` does not directly receive the whole grid object. It receives only the managers and callbacks required for keyboard actions:

```text
ClipboardManager
CellEditingManager
UndoRedoManager
selectAllData callback
clearSelectedCells callback
moveSelectedCell callback
extendSelectedRange callback
```

`SelectionManager` receives only scroll, rendering, and UI update callbacks that it needs for selection workflows.

This avoids tightly coupling every class to `Grid`.

---

## Dependency Inversion Principle

High-level classes should not depend directly on low-level details.

### Applied Examples

`Grid` delegates high-level workflows to managers instead of implementing all logic directly.

`UndoRedoManager` depends on:

```text
CommandManager
callbacks for render, persistence, UI refresh
```

It does not directly know the full grid implementation.

`CellEditingManager` depends on focused services:

```text
CellEditorService
KeyboardNavigationService
CommandManager
GridDataStore
```

This makes responsibilities clearer and easier to test or refactor.

---

## Why This Architecture Helps

The manager-based OOP structure provides these benefits:

```text
Cleaner Grid.ts
Smaller focused classes
Easier debugging
Easier feature additions
Better separation of concerns
More maintainable codebase
Clearer test areas
```

---

## Example Responsibility Flow

### Editing a Cell

```text
KeyboardManager or MouseInteractionManager starts editing
CellEditingManager commits edit
EditCellCommand stores old and new values
CommandManager executes command
PersistenceManager saves state
GridRenderer redraws visible cells
```

### Copy and Paste

```text
KeyboardManager receives Ctrl + C or Ctrl + V
ClipboardManager handles copy or paste
PasteCellsCommand stores changed cells
CommandManager executes paste command
GridRenderer redraws visible cells
PersistenceManager saves state
```

### Undo

```text
KeyboardManager receives Ctrl + Z
UndoRedoManager commits active editor
CommandManager calls undo on last command
GridRenderer redraws visible cells
PersistenceManager saves state
```

---

## Summary

The Excel Grid project applies OOP by dividing behavior into focused classes and managers. It applies SOLID principles by separating responsibilities, using command objects for reversible actions, passing only needed dependencies, and keeping the main grid class focused on orchestration.

This makes the project easier to maintain and extend with future spreadsheet features.
