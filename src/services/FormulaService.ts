import { GridConfig } from "../core/GridConfig";
import type { CellValue, GridDataStore } from "../core/GridDataStore";

type FormulaResult = string | number | null;

interface CellReference {
  rowIndex: number;
  columnIndex: number;
}

export class FormulaService {
  isFormula(value: CellValue): boolean {
    return typeof value === "string" && value.trim().startsWith("=");
  }

  evaluateCell(
    rowIndex: number,
    columnIndex: number,
    dataStore: GridDataStore,
    visitedCells: Set<string> = new Set<string>()
  ): FormulaResult {
    const cellKey = this.getCellKey(rowIndex, columnIndex);

    if (visitedCells.has(cellKey)) {
      return "#CYCLE!";
    }

    const rawValue = dataStore.getCellRawValue(rowIndex, columnIndex);

    if (!this.isFormula(rawValue)) {
      return rawValue;
    }

    visitedCells.add(cellKey);

    const formulaText = String(rawValue).trim().slice(1);
    const result = this.evaluateFormula(formulaText, dataStore, visitedCells);

    visitedCells.delete(cellKey);

    return result;
  }

  evaluateFormula(
    formulaText: string,
    dataStore: GridDataStore,
    visitedCells: Set<string> = new Set<string>()
  ): FormulaResult {
    const normalizedFormula = formulaText.trim();

    if (normalizedFormula === "") {
      return "";
    }

    const functionResult = this.evaluateFunctionFormula(
      normalizedFormula,
      dataStore,
      visitedCells
    );

    if (functionResult !== null) {
      return functionResult;
    }

    return this.evaluateArithmeticFormula(
      normalizedFormula,
      dataStore,
      visitedCells
    );
  }

  private evaluateFunctionFormula(
    formulaText: string,
    dataStore: GridDataStore,
    visitedCells: Set<string>
  ): FormulaResult {
    const match = formulaText.match(/^([A-Z]+)\((.*)\)$/i);

    if (!match) {
      return null;
    }

    const functionName = match[1].toUpperCase();
    const argumentText = match[2].trim();

    const supportedFunctions = new Set([
      "SUM",
      "AVG",
      "MIN",
      "MAX",
      "COUNT"
    ]);

    if (!supportedFunctions.has(functionName)) {
      return "#NAME?";
    }

    const values = this.getFunctionArgumentValues(
      argumentText,
      dataStore,
      visitedCells
    );

    const numericValues = values
      .map((value) => this.toNumber(value))
      .filter((value): value is number => value !== null);

    if (functionName === "COUNT") {
      return numericValues.length;
    }

    if (numericValues.length === 0) {
      return 0;
    }

    if (functionName === "SUM") {
      return numericValues.reduce((sum, value) => sum + value, 0);
    }

    if (functionName === "AVG") {
      const sum = numericValues.reduce((total, value) => total + value, 0);
      return sum / numericValues.length;
    }

    if (functionName === "MIN") {
      return Math.min(...numericValues);
    }

    if (functionName === "MAX") {
      return Math.max(...numericValues);
    }

    return "#ERROR!";
  }

  private getFunctionArgumentValues(
    argumentText: string,
    dataStore: GridDataStore,
    visitedCells: Set<string>
  ): FormulaResult[] {
    if (argumentText.trim() === "") {
      return [];
    }

    const argumentParts = argumentText
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "");

    const values: FormulaResult[] = [];

    for (const argument of argumentParts) {
      if (this.isRangeReference(argument)) {
        values.push(...this.getRangeValues(argument, dataStore, visitedCells));
        continue;
      }

      const cellReference = this.parseCellReference(argument);

      if (cellReference) {
        values.push(
          this.evaluateCell(
            cellReference.rowIndex,
            cellReference.columnIndex,
            dataStore,
            visitedCells
          )
        );
        continue;
      }

      const numericValue = Number(argument);

      if (!Number.isNaN(numericValue)) {
        values.push(numericValue);
      }
    }

    return values;
  }

  private evaluateArithmeticFormula(
    formulaText: string,
    dataStore: GridDataStore,
    visitedCells: Set<string>
  ): FormulaResult {
    try {
      const tokens = this.tokenizeExpression(
        formulaText,
        dataStore,
        visitedCells
      );

      const result = this.evaluateTokens(tokens);

      if (!Number.isFinite(result)) {
        return "#DIV/0!";
      }

      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("#")
      ) {
        return error.message;
      }

      return "#ERROR!";
    }
  }

  private tokenizeExpression(
    expression: string,
    dataStore: GridDataStore,
    visitedCells: Set<string>
  ): string[] {
    const tokens: string[] = [];
    let index = 0;

    while (index < expression.length) {
      const character = expression[index];

      if (character === " ") {
        index++;
        continue;
      }

      if (this.isOperator(character) || character === "(" || character === ")") {
        tokens.push(character);
        index++;
        continue;
      }

      if (this.isDigit(character) || character === ".") {
        let numberText = character;
        index++;

        while (
          index < expression.length &&
          (this.isDigit(expression[index]) || expression[index] === ".")
        ) {
          numberText += expression[index];
          index++;
        }

        tokens.push(numberText);
        continue;
      }

      if (this.isLetter(character)) {
        let referenceText = character;
        index++;

        while (
          index < expression.length &&
          /[A-Za-z0-9]/.test(expression[index])
        ) {
          referenceText += expression[index];
          index++;
        }

        const cellReference = this.parseCellReference(referenceText);

        if (!cellReference) {
          tokens.push("0");
          continue;
        }

        const cellValue = this.evaluateCell(
          cellReference.rowIndex,
          cellReference.columnIndex,
          dataStore,
          visitedCells
        );

        if (this.isFormulaError(cellValue)) {
          throw new Error(String(cellValue));
        }

        const numericValue = this.toNumber(cellValue);

        tokens.push(String(numericValue ?? 0));
        continue;
      }

      throw new Error("Invalid formula token.");
    }

    return tokens;
  }

  private evaluateTokens(tokens: string[]): number {
    const outputQueue: string[] = [];
    const operatorStack: string[] = [];

    for (const token of tokens) {
      if (!Number.isNaN(Number(token))) {
        outputQueue.push(token);
        continue;
      }

      if (this.isOperator(token)) {
        while (
          operatorStack.length > 0 &&
          this.isOperator(operatorStack[operatorStack.length - 1]) &&
          this.getOperatorPrecedence(operatorStack[operatorStack.length - 1]) >=
          this.getOperatorPrecedence(token)
        ) {
          outputQueue.push(operatorStack.pop() as string);
        }

        operatorStack.push(token);
        continue;
      }

      if (token === "(") {
        operatorStack.push(token);
        continue;
      }

      if (token === ")") {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== "("
        ) {
          outputQueue.push(operatorStack.pop() as string);
        }

        if (operatorStack.length === 0) {
          throw new Error("Mismatched parentheses.");
        }

        operatorStack.pop();
      }
    }

    while (operatorStack.length > 0) {
      const operator = operatorStack.pop() as string;

      if (operator === "(" || operator === ")") {
        throw new Error("Mismatched parentheses.");
      }

      outputQueue.push(operator);
    }

    return this.evaluateReversePolishNotation(outputQueue);
  }

  private evaluateReversePolishNotation(tokens: string[]): number {
    const stack: number[] = [];

    for (const token of tokens) {
      if (!Number.isNaN(Number(token))) {
        stack.push(Number(token));
        continue;
      }

      const rightValue = stack.pop();
      const leftValue = stack.pop();

      if (leftValue === undefined || rightValue === undefined) {
        throw new Error("Invalid expression.");
      }

      if (token === "+") {
        stack.push(leftValue + rightValue);
        continue;
      }

      if (token === "-") {
        stack.push(leftValue - rightValue);
        continue;
      }

      if (token === "*") {
        stack.push(leftValue * rightValue);
        continue;
      }

      if (token === "/") {
        stack.push(leftValue / rightValue);
        continue;
      }

      throw new Error("Unknown operator.");
    }

    if (stack.length !== 1) {
      throw new Error("Invalid expression.");
    }

    return stack[0];
  }

  private getRangeValues(
    rangeReference: string,
    dataStore: GridDataStore,
    visitedCells: Set<string>
  ): FormulaResult[] {
    const [startReferenceText, endReferenceText] = rangeReference.split(":");

    const startReference = this.parseCellReference(startReferenceText);
    const endReference = this.parseCellReference(endReferenceText);

    if (!startReference || !endReference) {
      return [];
    }

    const startRow = Math.min(startReference.rowIndex, endReference.rowIndex);
    const endRow = Math.max(startReference.rowIndex, endReference.rowIndex);

    const startColumn = Math.min(
      startReference.columnIndex,
      endReference.columnIndex
    );

    const endColumn = Math.max(
      startReference.columnIndex,
      endReference.columnIndex
    );

    const values: FormulaResult[] = [];

    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      for (
        let columnIndex = startColumn;
        columnIndex <= endColumn;
        columnIndex++
      ) {
        values.push(
          this.evaluateCell(rowIndex, columnIndex, dataStore, visitedCells)
        );
      }
    }

    return values;
  }

  private parseCellReference(value: string): CellReference | null {
    const match = value.trim().toUpperCase().match(/^([A-Z]+)([1-9][0-9]*)$/);

    if (!match) {
      return null;
    }

    const columnName = match[1];
    const rowNumber = Number(match[2]);

    const columnIndex = this.getColumnIndexFromName(columnName);
    const rowIndex = rowNumber - 1;

    const isValidReference =
      rowIndex >= 0 &&
      rowIndex < GridConfig.totalRows &&
      columnIndex >= 0 &&
      columnIndex < GridConfig.totalColumns;

    if (!isValidReference) {
      return null;
    }

    return {
      rowIndex,
      columnIndex
    };
  }

  private getColumnIndexFromName(columnName: string): number {
    let columnIndex = 0;

    for (let index = 0; index < columnName.length; index++) {
      const characterCode = columnName.charCodeAt(index) - 64;
      columnIndex = columnIndex * 26 + characterCode;
    }

    return columnIndex - 1;
  }

  private isRangeReference(value: string): boolean {
    return /^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/i.test(value.trim());
  }

  private toNumber(value: FormulaResult): number | null {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
      const numericValue = Number(value);

      return Number.isNaN(numericValue) ? null : numericValue;
    }

    return null;
  }

  private isOperator(value: string): boolean {
    return value === "+" || value === "-" || value === "*" || value === "/";
  }

  private getOperatorPrecedence(operator: string): number {
    if (operator === "*" || operator === "/") {
      return 2;
    }

    if (operator === "+" || operator === "-") {
      return 1;
    }

    return 0;
  }

  private isDigit(value: string): boolean {
    return /^[0-9]$/.test(value);
  }

  private isLetter(value: string): boolean {
    return /^[A-Za-z]$/.test(value);
  }

  private getCellKey(rowIndex: number, columnIndex: number): string {
    return `${rowIndex}:${columnIndex}`;
  }

  private isFormulaError(value: FormulaResult): boolean {
    return typeof value === "string" && value.startsWith("#");
  }
}