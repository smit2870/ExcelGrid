export class CanvasUtils {
  static getColumnName(index: number): string {
    let columnName = "";
    let columnNumber = index + 1;

    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      columnName = String.fromCharCode(65 + remainder) + columnName;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }

    return columnName;
  }

  static getMousePosition(
    canvas: HTMLCanvasElement,
    event: MouseEvent
  ): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
}