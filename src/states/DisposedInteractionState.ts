import type { GridInteractionContext } from "./GridInteractionContext";
import type { GridInteractionState } from "./GridInteractionState";

export class DisposedInteractionState
  implements GridInteractionState
{
  enter(context: GridInteractionContext): void {
    context.setCursor("default");
    context.cancelSelection();
  }

  exit(_context: GridInteractionContext): void {}

  handleMouseDown(
    _context: GridInteractionContext,
    _event: MouseEvent
  ): void {}

  handleMouseMove(
    _context: GridInteractionContext,
    _event: MouseEvent
  ): void {}

  handleMouseUp(
    _context: GridInteractionContext
  ): void {}

  handleDoubleClick(
    _context: GridInteractionContext,
    _event: MouseEvent
  ): void {}
}