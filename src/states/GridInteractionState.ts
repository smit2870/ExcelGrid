import type { GridInteractionContext } from "./GridInteractionContext";

export interface GridInteractionState {
  enter(context: GridInteractionContext): void;

  exit(context: GridInteractionContext): void;

  handleMouseDown(
    context: GridInteractionContext,
    event: MouseEvent
  ): void;

  handleMouseMove(
    context: GridInteractionContext,
    event: MouseEvent
  ): void;

  handleMouseUp(
    context: GridInteractionContext
  ): void;

  handleDoubleClick(
    context: GridInteractionContext,
    event: MouseEvent
  ): void;
}