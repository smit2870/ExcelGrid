import "./style.css";
import { Grid } from "./core/Grid";

const canvas = document.getElementById("gridCanvas") as HTMLCanvasElement;

if (!canvas) {
  throw new Error("Grid canvas element was not found.");
}

new Grid(canvas);