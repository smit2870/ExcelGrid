import type { GridInteractionContext } from "./GridInteractionContext";
import type { GridInteractionState } from "./GridInteractionState";

export class IdleInteractionState
  implements GridInteractionState
{
  enter(context: GridInteractionContext): void {
    context.setCursor("default");
  }

  exit(_context: GridInteractionContext): void {}

  handleMouseDown(
    context: GridInteractionContext,
    event: MouseEvent
  ): void {
    const mousePosition = context.getMousePosition(event);
    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const columnResizeIndex =
      context.getColumnResizeIndex(mouseX, mouseY);

    if (columnResizeIndex !== null) {
      context.commitCellEditor();

      context.startColumnResize(
        columnResizeIndex,
        mouseX
      );

      context.changeState(
        context.createColumnResizeState()
      );

      return;
    }

    const rowResizeIndex =
      context.getRowResizeIndex(mouseX, mouseY);

    if (rowResizeIndex !== null) {
      context.commitCellEditor();

      context.startRowResize(
        rowResizeIndex,
        mouseY
      );

      context.changeState(
        context.createRowResizeState()
      );

      return;
    }

    if (context.isTopLeftCorner(mouseX, mouseY)) {
      context.commitCellEditor();
      context.cancelSelection();
      context.clearSelection();
      return;
    }

    if (context.isColumnHeader(mouseX, mouseY)) {
      context.commitCellEditor();
      context.selectColumnFromHeader(mouseX);
      return;
    }

    if (context.isRowHeader(mouseX, mouseY)) {
      context.commitCellEditor();
      context.selectRowFromHeader(mouseY);
      return;
    }

    context.commitCellEditor();

    const selectionStarted =
      context.startRangeSelection(mouseX, mouseY);

    if (selectionStarted) {
      context.changeState(
        context.createSelectingState()
      );
    }
  }

  handleMouseMove(
    context: GridInteractionContext,
    event: MouseEvent
  ): void {
    const mousePosition = context.getMousePosition(event);
    const mouseX = mousePosition.x;
    const mouseY = mousePosition.y;

    const columnResizeIndex =
      context.getColumnResizeIndex(mouseX, mouseY);

    if (columnResizeIndex !== null) {
      context.setCursor("col-resize");
      return;
    }

    const rowResizeIndex =
      context.getRowResizeIndex(mouseX, mouseY);

    if (rowResizeIndex !== null) {
      context.setCursor("row-resize");
      return;
    }

    context.setCursor("default");
  }

  handleMouseUp(
    context: GridInteractionContext
  ): void {
    context.cancelSelection();
  }

  handleDoubleClick(
    context: GridInteractionContext,
    event: MouseEvent
  ): void {
    const mousePosition =
      context.getMousePosition(event);

    context.handleCellDoubleClick(
      mousePosition.x,
      mousePosition.y
    );
  }
}