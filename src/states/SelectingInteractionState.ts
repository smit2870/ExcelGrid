import type { GridInteractionContext } from "./GridInteractionContext";
import type { GridInteractionState } from "./GridInteractionState";

export class SelectingInteractionState
  implements GridInteractionState
{
  enter(_context: GridInteractionContext): void {}

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

    context.updateRangeSelection(
      mousePosition.x,
      mousePosition.y
    );
  }

  handleMouseUp(
    context: GridInteractionContext
  ): void {
    context.finishRangeSelection();

    context.changeState(
      context.createIdleState()
    );
  }

  handleDoubleClick(
    _context: GridInteractionContext,
    _event: MouseEvent
  ): void {}
}