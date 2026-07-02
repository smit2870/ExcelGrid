# Excel Grid View

Excel Grid View is a TypeScript-based Excel-like grid application built using HTML Canvas, HTML, and CSS.  
The project is designed to handle a large spreadsheet-style grid efficiently using virtual rendering and Object-Oriented Programming principles.

---

## Description

This project renders an Excel-style grid on an HTML canvas instead of using a normal HTML table.  
Canvas rendering is used because the grid needs to support a very large number of rows and columns.

The grid is designed to support:

- Excel-like row and column headers
- Cell selection
- Row selection
- Column selection
- Cell range selection
- Future support for editing, resizing, statistics, and undo/redo

The project follows an Object-Oriented structure where each class has a clear responsibility.

---

## Tech Stack

- TypeScript
- HTML
- CSS
- HTML Canvas
- Vite

---

## Features Implemented

### Completed

- Project setup using Vite and TypeScript
- Basic HTML and CSS layout
- Canvas-based grid rendering
- Excel-like column headers such as A, B, C, ..., Z, AA
- Excel-like row headers such as 1, 2, 3, ...
- 1,00,000 rows configured
- 500 columns configured
- Optimized data storage using
- Generated 50,000 JSON employee records
- Loaded JSON data into the first five columns
- Virtual rendering for better performance
- Basic vertical and horizontal scrolling
- Cell selection
- Selected cell display in the status bar
- Row selection
- Column selection
- Cell range selection by dragging
- Status bar updates for selected cell, row, column, and range

---

## Features Pending

The following features are planned for upcoming phases:

- Cell editing using an HTML input overlay
- Command Pattern implementation
- Undo and redo support
- Column resizing
- Row resizing
- Statistics calculation for selected numeric cells:
  - Count
  - Min
  - Max
  - Sum
  - Average
- Keyboard navigation
- Delete selected cell content
- Separate mouse and keyboard event handler classes

---

## Project Structure

```text

ExcelGrid/
├── index.html
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── main.ts
│   ├── style.css
│   ├── core/
│   │   ├── Grid.ts
│   │   ├── GridConfig.ts
│   │   ├── GridDataStore.ts
│   │   └── GridRenderer.ts
│   ├── models/
│   │   └── Selection.ts
│   ├── services/
│   │   ├── DataGenerator.ts
│   │   └── SelectionService.ts
│   └── utils/
│       └── CanvasUtils.ts
```

---

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/smit2870/ExcelGrid.git
```

### 2. Move Into Project Folder

```bash
cd ExcelGrid
```

### 3. Install Dependencies

```bash
npm install
```

---

## Run the Project

Start the development server:

```bash
npm run dev
```

After running the command, open the local URL shown in the terminal.

Example:

```http
http://localhost:5173/
```

---

## Build the Project

To create a production build:

```bash
npm run build
```

---

## Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

---


## Important Implementation Concepts

### Canvas Rendering

The grid is rendered using a single HTML canvas element.

Instead of creating thousands of HTML elements, the application manually draws:

- Cell backgrounds
- Grid lines
- Row headers
- Column headers
- Cell values
- Selection highlights
