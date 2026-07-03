import type { ICommand } from "./ICommand";

export class CommandManager {
  private undoStack: ICommand[];
  private redoStack: ICommand[];

  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }

  execute(command: ICommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
  }

  undo(): void {
    const command = this.undoStack.pop();

    if (!command) {
      return;
    }

    command.undo();
    this.redoStack.push(command);
  }

  redo(): void {
    const command = this.redoStack.pop();

    if (!command) {
      return;
    }

    command.execute();
    this.undoStack.push(command);
  }
}