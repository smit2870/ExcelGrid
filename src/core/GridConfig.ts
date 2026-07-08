export class GridConfig {
  static readonly totalRows = 100000;
  static readonly totalColumns = 500;

  static readonly defaultRowHeight = 24;
  static readonly defaultColumnWidth = 120;

  static readonly minRowHeight = 18;
  static readonly minColumnWidth = 40;

  static readonly rowHeaderWidth = 48;
  static readonly columnHeaderHeight = 28;

  static readonly font = "12px Arial, Helvetica, sans-serif";
  static readonly headerFont = "600 12px Arial, Helvetica, sans-serif";

  static readonly backgroundColor = "#ffffff";

  static readonly gridLineColor = "#e0e0e0";
  static readonly headerBackgroundColor = "#f3f4f6";
  static readonly headerTextColor = "#333333";

  static readonly cellTextColor = "#222222";

  static readonly selectedCellFillColor = "rgba(33, 115, 70, 0.12)";
  static readonly selectedCellBorderColor = "#217346";

  static readonly selectedHeaderBackgroundColor = "#dff0e7";
  static readonly selectedHeaderTextColor = "#145c38";

  static readonly activeCellBorderColor = "#217346";
  static readonly activeCellBorderWidth = 2;

  static readonly rangeBorderColor = "#217346";
  static readonly rangeBorderWidth = 2;
}