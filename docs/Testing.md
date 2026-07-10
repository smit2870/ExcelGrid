# Testing Expectations

This document defines manual test scenarios for validating the Excel Grid application.

At least 20 test scenarios are required. This document includes 40 specific and executable scenarios covering editing, resizing, selection, summary calculations, data loading, performance, keyboard actions, formulas, persistence, and error handling.

---

## Test Environment

```text
Application: Excel Grid
Browser: Chrome / Edge
Data Source: Generated employee records and manual test entries
Storage: IndexedDB enabled
```

---

# Manual Test Scenarios

## Editing Tests

### Test 1: Edit an empty cell

**Area:** Editing

**Steps:**

1. Open the grid.
2. Select an empty cell outside the generated data area, for example `G10`.
3. Press `Enter` or double-click the cell.
4. Type:

```text
Hello
```

5. Press `Enter`.

**Expected Result:**

- Cell `G10` displays `Hello`.
- Formula bar shows `Hello` when `G10` is selected.
- No console error occurs.

---

### Test 2: Edit numeric cell with text

**Area:** Editing

**Steps:**

1. Select a generated numeric cell, for example an age or salary cell.
2. Press `Enter`.
3. Replace the value with:

```text
Test Value
```

4. Press `Enter`.

**Expected Result:**

- The numeric cell displays `Test Value`.
- Formula bar shows `Test Value`.
- The grid does not crash when numeric data is replaced with text.

---

### Test 3: Edit cell and undo

**Area:** Editing / Undo

**Steps:**

1. Select an editable cell.
2. Change its value to:

```text
Undo Test
```

3. Press `Enter`.
4. Press `Ctrl + Z`.

**Expected Result:**

- The cell returns to its previous value.
- Formula bar updates to the previous value.
- Grid remains responsive.

---

### Test 4: Edit cell and redo

**Area:** Editing / Redo

**Steps:**

1. Complete Test 3.
2. Press `Ctrl + Y`.

**Expected Result:**

- The cell value changes back to `Undo Test`.
- Formula bar updates correctly.
- No duplicate edit occurs.

---

### Test 5: Cancel cell edit with Escape

**Area:** Editing / Keyboard

**Steps:**

1. Select a cell.
2. Press `Enter` to start editing.
3. Type:

```text
Cancelled Text
```

4. Press `Escape`.

**Expected Result:**

- The cell keeps its original value.
- The editor closes.
- No change is saved.

---

## Formula Tests

### Test 6: Basic arithmetic formula

**Area:** Formula

**Steps:**

1. Set `A1` to:

```text
10
```

2. Set `B1` to:

```text
20
```

3. Set `C1` to:

```text
=A1+B1
```

**Expected Result:**

- Cell `C1` displays `30`.
- Formula bar shows `=A1+B1` when `C1` is selected.
- Editing `C1` shows raw formula text.

---

### Test 7: SUM formula

**Area:** Formula

**Steps:**

1. Enter values:

```text
A1 = 10
A2 = 20
A3 = 30
```

2. Enter in `B1`:

```text
=SUM(A1:A3)
```

**Expected Result:**

- `B1` displays `60`.
- Formula bar shows `=SUM(A1:A3)`.

---

### Test 8: Formula persistence after refresh

**Area:** Formula / Persistence

**Steps:**

1. Enter:

```text
A1 = 10
B1 = 20
C1 = =A1+B1
```

2. Refresh the browser.

**Expected Result:**

- `C1` still displays `30`.
- Formula bar still shows `=A1+B1`.
- No data loss occurs.

---

## Resizing Tests

### Test 9: Resize column to normal size

**Area:** Resizing

**Steps:**

1. Hover over the border between column `A` and column `B`.
2. Drag the border to increase column `A` width.
3. Release the mouse.

**Expected Result:**

- Column `A` width changes.
- Cells in column `A` render correctly.
- Custom scrollbar updates if needed.

---

### Test 10: Resize column to very small size

**Area:** Resizing

**Steps:**

1. Drag a column border left until it reaches minimum width.

**Expected Result:**

- Column does not shrink below `GridConfig.minColumnWidth`.
- Grid remains usable.
- No visual corruption occurs.

---

### Test 11: Undo column resize

**Area:** Resizing / Undo

**Steps:**

1. Resize a column.
2. Press `Ctrl + Z`.

**Expected Result:**

- Column width returns to previous size.
- Grid rerenders correctly.

---

### Test 12: Redo column resize

**Area:** Resizing / Redo

**Steps:**

1. Complete Test 11.
2. Press `Ctrl + Y`.

**Expected Result:**

- Column width changes back to resized width.
- Scrollbars remain correct.

---

### Test 13: Resize row to normal size

**Area:** Resizing

**Steps:**

1. Hover over the border between row `1` and row `2`.
2. Drag down to increase row height.
3. Release mouse.

**Expected Result:**

- Row height increases.
- Cell text remains vertically aligned.
- Grid rerenders correctly.

---

### Test 14: Resize row to very small size

**Area:** Resizing

**Steps:**

1. Drag row border upward until minimum height is reached.

**Expected Result:**

- Row does not shrink below `GridConfig.minRowHeight`.
- Grid does not break visually.

---

## Selection Tests

### Test 15: Select a single cell

**Area:** Selection

**Steps:**

1. Click cell `A1`.

**Expected Result:**

- Cell `A1` is selected.
- Name box displays `A1`.
- Formula bar shows raw value of `A1`.

---

### Test 16: Select a row

**Area:** Selection

**Steps:**

1. Click row header `5`.

**Expected Result:**

- Entire row `5` is selected.
- Row header is highlighted.
- Status bar updates based on row values.

---

### Test 17: Select a column

**Area:** Selection

**Steps:**

1. Click column header `C`.

**Expected Result:**

- Entire column `C` is selected.
- Column header is highlighted.
- Status bar updates based on column values.

---

### Test 18: Select visible range with mouse

**Area:** Selection

**Steps:**

1. Click cell `A1`.
2. Drag to cell `D10`.

**Expected Result:**

- Range `A1:D10` is selected.
- Name box displays `A1:D10`.
- Selection border and fill are visible.

---

### Test 19: Select range after scrolling

**Area:** Selection / Scrolling

**Steps:**

1. Scroll down to around row `500`.
2. Click a cell.
3. Drag to select a range of nearby cells.

**Expected Result:**

- Range selection works after scrolling.
- Correct row and column positions are selected.
- No offset mismatch occurs.

---

### Test 20: Mouse drag selection auto-scroll

**Area:** Selection / Performance

**Steps:**

1. Click a visible cell.
2. Drag mouse toward the bottom edge of the grid.
3. Keep holding mouse near the bottom edge.

**Expected Result:**

- Grid automatically scrolls downward.
- Selection range expands while scrolling.
- App remains responsive.

---

## Summary / Status Bar Tests

### Test 21: Numeric-only range summary

**Area:** Summary

**Steps:**

1. Enter:

```text
A1 = 10
A2 = 20
A3 = 30
```

2. Select range `A1:A3`.

**Expected Result:**

- Status bar shows count, sum, average, minimum, and maximum.
- Expected values:

```text
Count: 3
Sum: 60
Avg: 20
Min: 10
Max: 30
```

---

### Test 22: Mixed numeric and text range summary

**Area:** Summary

**Steps:**

1. Enter:

```text
A1 = 10
A2 = Hello
A3 = 30
```

2. Select range `A1:A3`.

**Expected Result:**

- Status bar only counts numeric values.
- Count is `2`.
- Sum is `40`.

---

### Test 23: Empty selection summary

**Area:** Summary

**Steps:**

1. Select an empty range.

**Expected Result:**

- Status bar displays default or empty summary.
- No `NaN` or error appears.

---

### Test 24: Large selected range summary

**Area:** Summary / Performance

**Steps:**

1. Select a large range, for example `A1:E1000`.

**Expected Result:**

- Status bar updates after debounce.
- App does not freeze.
- Statistics are calculated from numeric values only.

---

## Data Loading Tests

### Test 25: Load generated records

**Area:** Data Loading

**Steps:**

1. Start the application.
2. Wait for initial grid render.

**Expected Result:**

- Generated records are loaded.
- First columns contain employee-style data.
- No loading crash occurs.

---

### Test 26: Import valid JSON

**Area:** Data Loading / Import

**Steps:**

1. Export current grid as JSON.
2. Click `Clear Saved Data`.
3. Import the exported JSON file.

**Expected Result:**

- Data is restored.
- Row heights and column widths are restored.
- Formulas are restored if present.

---

### Test 27: Import JSON with missing fields

**Area:** Data Loading / Error Handling

**Steps:**

1. Create a JSON file missing one of these fields:

```text
cells
rowHeights
columnWidths
```

2. Try importing it.

**Expected Result:**

- App does not crash.
- Invalid file is rejected or ignored.
- Console may show validation error.

---

### Test 28: Import invalid values

**Area:** Data Loading / Error Handling

**Steps:**

1. Create JSON with invalid cell values or malformed structure.
2. Import the file.

**Expected Result:**

- App does not crash.
- Invalid data does not corrupt grid state.
- Existing grid remains usable.

---

## Performance Tests

### Test 29: Scroll near last row

**Area:** Performance / Scrolling

**Steps:**

1. Use vertical scrollbar or mouse wheel to scroll near row `100000`.

**Expected Result:**

- Grid continues rendering visible rows only.
- Scrollbar remains usable.
- No major freezing occurs.

---

### Test 30: Scroll near last column

**Area:** Performance / Scrolling

**Steps:**

1. Use horizontal scrollbar to scroll near column `500`.

**Expected Result:**

- Grid renders columns near the end.
- Column headers remain correct.
- No layout corruption occurs.

---

### Test 31: Load time observation

**Area:** Performance

**Steps:**

1. Open the application in a fresh browser tab.
2. Observe time until grid appears.

**Expected Result:**

- Grid loads within acceptable time.
- Browser tab does not become unresponsive.
- No startup errors appear in console.

---

## Keyboard Tests

### Test 32: Arrow key navigation

**Area:** Keyboard

**Steps:**

1. Select cell `A1`.
2. Press Arrow Right.
3. Press Arrow Down.

**Expected Result:**

- Selection moves to `B1`, then `B2`.
- Name box updates.
- Grid remains smooth.

---

### Test 33: Hold arrow key

**Area:** Keyboard / Performance

**Steps:**

1. Select a cell.
2. Hold Arrow Down for several seconds.

**Expected Result:**

- Selection moves smoothly.
- Grid scrolls as needed.
- App does not lag severely.

---

### Test 34: Enter starts editing

**Area:** Keyboard / Editing

**Steps:**

1. Select a cell.
2. Press `Enter`.

**Expected Result:**

- Cell editor opens.
- Current raw cell value is shown.

---

### Test 35: Escape cancels editing

**Area:** Keyboard / Editing

**Steps:**

1. Start editing a cell.
2. Type new text.
3. Press `Escape`.

**Expected Result:**

- Editor closes.
- Original value remains unchanged.

---

### Test 36: Ctrl+Z undo

**Area:** Keyboard / Undo

**Steps:**

1. Edit a cell.
2. Press `Ctrl + Z`.

**Expected Result:**

- Edit is undone.
- Cell value returns to previous state.

---

### Test 37: Ctrl+Y redo

**Area:** Keyboard / Redo

**Steps:**

1. Complete Test 36.
2. Press `Ctrl + Y`.

**Expected Result:**

- Edit is redone.
- Cell value returns to edited state.

---

## Error Handling Tests

### Test 38: Unsupported formula should not crash

**Area:** Error Handling / Formula

**Steps:**

1. Enter:

```text
=UNKNOWN(A1:A5)
```

**Expected Result:**

- Cell displays formula error such as `#NAME?`.
- App does not crash.

---

### Test 39: Circular formula should not crash

**Area:** Error Handling / Formula

**Steps:**

1. Enter in `A1`:

```text
=B1
```

2. Enter in `B1`:

```text
=A1
```

**Expected Result:**

- Circular reference displays an error such as `#CYCLE!`.
- App remains responsive.

---

### Test 40: Invalid import should not crash

**Area:** Error Handling / Import

**Steps:**

1. Import a non-JSON file or malformed JSON file.

**Expected Result:**

- App does not crash.
- Grid remains usable.
- Error is logged or ignored safely.

---


