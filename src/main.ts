const app = document.querySelector<HTMLElement>("#app")!;

const heading = document.createElement("h1");
heading.textContent = "D2 project";

const squareDimension = 512;

const canvas = document.createElement("canvas");
canvas.width = squareDimension;
canvas.height = squareDimension;
canvas.style.border = "2px solid #000000";

const invCanvas = document.createElement("canvas");
invCanvas.width = squareDimension * 1.5;
invCanvas.height = squareDimension * 1.5;
invCanvas.style.border = "2px solid #000000";

//const message = document.createElement("p");
//message.textContent = "Your project starts here.";
const exportUI = document.createElement("button");
exportUI.innerHTML = "Export";
const otherCtx = invCanvas.getContext("2d")!;

app.append(heading, canvas);

const ctx = canvas.getContext("2d")!;
const cursor = { active: false, x: 0, y: 0 };

let lineStarted = false;

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
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

const commands: Command[] = [];
const redoStack: Command[] = [];
let currentLine: LineCommand | null = null;
let currentTool: "marker" | "sticker" = "marker";
let currentThickness = 2;
let currentSticker = "😃";
let currentColor = "#000000";

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const cmd of commands) {
    cmd.draw(ctx);
  }
}

const toolsDiv = document.createElement("div");
toolsDiv.style.marginBottom = "10px";
app.append(toolsDiv);

const thinButton = document.createElement("button");
thinButton.innerHTML = "thin marker";
thinButton.onclick = () => {
  currentTool = "marker";
  currentThickness = 2;
};
toolsDiv.append(thinButton);

const thickButton = document.createElement("button");
thickButton.innerHTML = "thick marker";
thickButton.onclick = () => {
  currentTool = "marker";
  currentThickness = 6;
};
toolsDiv.append(thickButton);

const colorPicker = document.createElement("input");
colorPicker.type = "color";
colorPicker.value = currentColor;
colorPicker.oninput = (e) => {
  currentColor = (e.target as HTMLInputElement).value;
};
toolsDiv.append(colorPicker);

const stickers = ["😃", "🔥", "👍"];
for (const emoji of stickers) {
  const btn = document.createElement("button");
  btn.innerHTML = emoji;
  btn.onclick = () => {
    currentTool = "sticker";
    currentSticker = emoji;
  };
  toolsDiv.append(btn);
}

canvas.addEventListener("mousedown", (e) => {
  cursor.active = true;

  if (currentTool === "sticker") {
    redoStack.splice(0, redoStack.length);
    commands.push(new StickerCommand(e.offsetX, e.offsetY, currentSticker));
    redraw();
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
    redraw();
  }
});

canvas.addEventListener("mouseup", () => {
  cursor.active = false;
  currentLine = null;
  redraw();
  lineStarted = false;
});

const controlsDiv = document.createElement("div");
app.append(controlsDiv);

const undoButton = document.createElement("button");
undoButton.innerHTML = "undo";
controlsDiv.append(undoButton);

undoButton.addEventListener("click", () => {
  if (commands.length > 0) {
    redoStack.push(commands.pop()!);
    redraw();
  }
});

const redoButton = document.createElement("button");
redoButton.innerHTML = "redo";
controlsDiv.append(redoButton);

redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    commands.push(redoStack.pop()!);
    redraw();
  }
});

const clearButton = document.createElement("button");
clearButton.innerHTML = "clear";
controlsDiv.append(clearButton);

clearButton.addEventListener("click", () => {
  commands.splice(0, commands.length);
  redraw();
});

document.body.append(exportUI);
exportUI.addEventListener("click", () => {
  console.log("export!");

  otherCtx.clearRect(0, 0, invCanvas.width, invCanvas.height);
  for (const cmd of commands) {
    cmd.draw(otherCtx);
  }

  invCanvas.toBlob((blob) => {
    const savedImg = document.createElement("img");
    const url = URL.createObjectURL(blob!);

    savedImg.src = url;

    const download = document.createElement("a"); //source https://medium.com/@rohitkuwar/understanding-blob-in-javascript-a-practical-guide-for-frontend-developers-9fcd131a50f4
    download.href = url;
    download.innerText = "download";
    document.body.appendChild(download);

    download.click();
    document.body.removeChild(download);
  });
});
