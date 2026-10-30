import { createPublicKey } from "node:crypto";

const app = document.querySelector<HTMLElement>("#app")!;

const commands: Command[] = [];
const redoStack: Command[] = [];
let currentLine: LineCommand | null = null;
let lineStarted = false;

let currentTool: "marker" | "sticker" = "marker";
let currentThickness = 2;
let currentSticker = "😃";
let currentColor = "#000000";

const thinSize = 2;
const medSize = 4;
const thickSize = 6;
const squareDimension = 512;

document.body.style.backgroundColor = "#c9c9c9";

const heading = document.createElement("h1");
heading.textContent = "D2 project";

const canvas = document.createElement("canvas");
canvas.width = squareDimension;
canvas.height = squareDimension;
canvas.style.border = "2px solid #000000";

const invCanvas = document.createElement("canvas");
invCanvas.width = squareDimension * 1.5;
invCanvas.height = squareDimension * 1.5;

app.append(heading, canvas);

const toolsDiv = document.createElement("div");
toolsDiv.style.marginBottom = "10px";
app.append(toolsDiv);

interface tool {
  name: string;
  type: "marker" | "sticker";
  size: number;
}

const toolList: tool[] = [
  {
    name: "thin marker",
    type: "marker",
    size: thinSize,
  },
  {
    name: "medium marker",
    type: "marker",
    size: medSize,
  },
  {
    name: "thick marker",
    type: "marker",
    size: thickSize,
  },
];

for (const tool of toolList) {
  const btn = document.createElement("button");
  btn.innerHTML = tool.name;
  btn.onclick = () => {
    currentTool = tool.type;
    currentThickness = tool.size;
  };
  toolsDiv.append(btn);
}

const colorPicker = document.createElement("input");
colorPicker.type = "color";
colorPicker.value = currentColor;
toolsDiv.append(colorPicker);

const stickers = ["😃", "🔥", "👍", "hi"];
for (const emoji of stickers) {
  const btn = document.createElement("button");
  btn.innerHTML = emoji;
  btn.onclick = () => {
    currentTool = "sticker";
    currentSticker = emoji;
  };
  toolsDiv.append(btn);
}

//controls

const controlsDiv = document.createElement("div");
app.append(controlsDiv);

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
controlsDiv.append(undoButton);

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
controlsDiv.append(redoButton);

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
controlsDiv.append(clearButton);

const exportButton = document.createElement("button");
exportButton.innerHTML = "Export";
exportButton.style.marginTop = "10px";

const otherCtx = invCanvas.getContext("2d")!;
otherCtx.fillStyle = "#ffffff";
document.body.append(exportButton);

const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, canvas.width, canvas.height);

interface Point {
  x: number;
  y: number;
}

interface Command {
  draw(ctx: CanvasRenderingContext2D): void;
}

class LineCommand implements Command {
  points: Point[] = [];
  constructor(
    public color: string,
    public thickness: number,
    startX: number,
    startY: number,
  ) {
    this.points.push({ x: startX, y: startY });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.thickness;
      const { x, y } = this.points[0];
      ctx.moveTo(x, y);
      for (const { x, y } of this.points) {
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

class StickerCommand implements Command {
  constructor(public x: number, public y: number, public emoji: string) {}

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#000000";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

colorPicker.oninput = (e) => {
  currentColor = (e.target as HTMLInputElement).value;
};

canvas.addEventListener("mousedown", (e) => { //mousedown mousemove mouseup
  cursor.active = true;

  if (currentTool === "sticker") {
    redoStack.splice(0, redoStack.length);
    commands.push(new StickerCommand(e.offsetX, e.offsetY, currentSticker));
    redraw(ctx, canvas);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (cursor.active) {
    if ((currentTool === "marker") && (!lineStarted)) { //was prev in mousedown
      redoStack.splice(0, redoStack.length);
      currentLine = new LineCommand(
        currentColor,
        currentThickness,
        e.offsetX,
        e.offsetY,
      );
      commands.push(currentLine);
      lineStarted = true;
    }

    cursor.x = e.offsetX;
    cursor.y = e.offsetY;
    currentLine?.points.push({ x: e.offsetX, y: e.offsetY });
    redraw(ctx, canvas);
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentLine = null;
  redraw(ctx, canvas);
  lineStarted = false;
});

undoButton.addEventListener("click", () => {
  if (commands.length > 0) {
    redoStack.push(commands.pop()!);
    redraw(ctx, canvas);
  }
});

redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    commands.push(redoStack.pop()!);
    redraw(ctx, canvas);
  }
});

clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  console.log(redoStack);
  redraw(ctx, canvas);
});

exportButton.addEventListener("click", () => {
  redraw(otherCtx, invCanvas);

  invCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob!);
    const download = document.createElement("a"); //source https://medium.com/@rohitkuwar/understanding-blob-in-javascript-a-practical-guide-for-frontend-developers-9fcd131a50f4
    download.href = url;
    download.innerText = "download";
    document.body.appendChild(download);
    download.click();
    document.body.removeChild(download);
  });
});

function redraw(context: CanvasRenderingContext2D, canv: HTMLCanvasElement) {
  context.clearRect(0, 0, canv.width, canv.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canv.width, canv.height);
  for (const cmd of commands) {
    cmd.draw(context);
  }
}

//function append tools

//function append controls
