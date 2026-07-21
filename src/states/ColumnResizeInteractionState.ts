import type { GridInteractionContext } from "./GridInteractionContext";
import type { GridInteractionState } from "./GridInteractionState";

export class ColumnResizeInteractionState
  implements GridInteractionState
{
  enter(context: GridInteractionContext): void {
    context.setCursor("col-resize");
  }

  exit(_context: GridInteractionContext): void {}

  handleMouseDown(
    _context: GridInteractionContext,
    _event: MouseEvent
  ): void {}

  handleMouseMove(
    context: GridInteractionContext,
    event: MouseEvent
  ): void {
    const mousePosition = context.getMousePosition(event);

    context.updateColumnResize(mousePosition.x);
    context.updateResizeUi();
  }

  handleMouseUp(
    context: GridInteractionContext
  ): void {
    context.finishColumnResize();
    context.savePersistedState();
    context.setCursor("default");
    context.updateResizeUi();

    context.changeState(
      context.createIdleState()
    );
  }

  handleDoubleClick(
    _context: GridInteractionContext,
    _event: MouseEvent
  ): void {}
}