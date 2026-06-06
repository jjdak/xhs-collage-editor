const poster = document.querySelector("#poster");
const sourceText = document.querySelector("#sourceText");
const statusText = document.querySelector("#statusText");
const editText = document.querySelector("#editText");
const fontSize = document.querySelector("#fontSize");
const boxWidth = document.querySelector("#boxWidth");
const textColor = document.querySelector("#textColor");
const bgColor = document.querySelector("#bgColor");
const bgAlpha = document.querySelector("#bgAlpha");
const controls = [editText, fontSize, boxWidth, textColor, bgColor, bgAlpha];

let selected = null;
let zCounter = 10;
let layoutSeed = 0;

const demoImages = [
  {
    label: "书本",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260"><rect width="360" height="260" fill="#efe9dd"/><circle cx="262" cy="86" r="52" fill="#f7f7f7"/><rect x="75" y="72" width="210" height="124" rx="8" fill="#fff"/><path d="M92 91h81v84H92zM188 91h80v84h-80z" fill="#f6f0e8"/><path d="M177 88v91" stroke="#999" stroke-width="2"/><text x="103" y="139" font-size="30" font-family="sans-serif" font-weight="700" fill="#111">孩子</text><text x="104" y="166" font-size="15" font-family="sans-serif" fill="#333">为你自己读书</text><circle cx="240" cy="70" r="8" fill="#111"/><circle cx="282" cy="70" r="8" fill="#111"/><path d="M251 95q11 13 24 0" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    label: "便当",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="330"><rect width="300" height="330" fill="#272727"/><rect x="52" y="68" width="178" height="135" rx="14" fill="#d9d2bb"/><rect x="68" y="83" width="146" height="104" rx="10" fill="#f7f0d8"/><circle cx="202" cy="222" r="38" fill="#7c2033"/><circle cx="170" cy="238" r="30" fill="#e1cb6e"/><rect x="32" y="210" width="68" height="95" rx="26" fill="#d6e4ef"/><rect x="24" y="195" width="84" height="25" rx="12" fill="#bb1d2d"/></svg>`,
  },
  {
    label: "便签",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#f2e9ee"/><rect x="40" y="44" width="240" height="150" rx="6" fill="#fffafc"/><path d="M58 78h160M58 112h184M58 146h140" stroke="#9f9f9f" stroke-width="4" stroke-linecap="round"/><text x="70" y="174" font-size="22" font-family="sans-serif" fill="#111">先做一分钟</text></svg>`,
  },
];

function parseInput(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const top = lines[0] || "期末周 | 大考 | 能量恢复";
  const title = lines[1] || "状态差自救指南";
  const rest = lines.slice(2);
  const list = rest.filter((line) => line.includes("=") || line.includes("："));
  const paragraphs = rest.filter((line) => !list.includes(line));
  return { top, title, paragraphs, list };
}

function createText(text, className, options = {}) {
  const el = document.createElement("div");
  el.className = `item text-item ${className || ""}`.trim();
  el.textContent = text;
  applyBox(el, options);
  makeInteractive(el);
  poster.append(el);
  return el;
}

function createImage(src, className, options = {}) {
  const el = document.createElement("div");
  el.className = `item image-item ${className || ""}`.trim();
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  el.append(img);
  applyBox(el, options);
  makeInteractive(el);
  poster.append(el);
  return el;
}

function applyBox(el, options) {
  const {
    x = 40,
    y = 40,
    w = 220,
    h,
    size = 28,
    color = "#171717",
    bg,
    alpha = 100,
    z,
  } = options;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  if (h) el.style.height = `${h}px`;
  el.style.fontSize = `${size}px`;
  el.style.color = color;
  if (bg) {
    el.dataset.bgHex = bg;
    el.dataset.bgAlpha = String(alpha);
    el.style.backgroundColor = hexToRgba(bg, alpha / 100);
  }
  el.style.zIndex = String(z || zCounter++);
}

function makeInteractive(el) {
  el.addEventListener("pointerdown", startDrag);
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    select(el);
  });
}

function startDrag(event) {
  const el = event.currentTarget;
  select(el);
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = el.getBoundingClientRect();
  const posterRect = poster.getBoundingClientRect();
  const scale = posterRect.width / 540;
  const initialLeft = (rect.left - posterRect.left) / scale;
  const initialTop = (rect.top - posterRect.top) / scale;

  el.setPointerCapture(event.pointerId);
  function move(moveEvent) {
    const nextLeft = initialLeft + (moveEvent.clientX - startX) / scale;
    const nextTop = initialTop + (moveEvent.clientY - startY) / scale;
    el.style.left = `${Math.max(-20, Math.min(520, nextLeft))}px`;
    el.style.top = `${Math.max(-20, Math.min(700, nextTop))}px`;
  }
  function stop() {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", stop);
    el.removeEventListener("pointercancel", stop);
  }
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

function select(el) {
  if (selected) selected.classList.remove("selected");
  selected = el;
  selected.classList.add("selected");
  statusText.textContent = "已选中元素，可拖拽或调整样式";
  const isText = selected.classList.contains("text-item");
  controls.forEach((control) => {
    control.disabled = false;
  });
  editText.disabled = !isText;
  editText.value = isText ? selected.textContent : "";
  fontSize.value = parseInt(selected.style.fontSize, 10) || 28;
  boxWidth.value = parseInt(selected.style.width, 10) || 220;
  textColor.value = rgbToHex(selected.style.color) || "#171717";
  bgColor.value = selected.dataset.bgHex || "#ffffff";
  bgAlpha.value = selected.dataset.bgAlpha || "0";
  document.querySelector("#bringForward").disabled = false;
  document.querySelector("#deleteBtn").disabled = false;
}

function clearSelection() {
  if (selected) selected.classList.remove("selected");
  selected = null;
  statusText.textContent = "选择元素后可在右侧调整";
  controls.forEach((control) => {
    control.disabled = true;
  });
  document.querySelector("#bringForward").disabled = true;
  document.querySelector("#deleteBtn").disabled = true;
}

function buildPoster() {
  const { top, title, paragraphs, list } = parseInput(sourceText.value);
  poster.innerHTML = "";
  selected = null;
  zCounter = 10;

  if (layoutSeed % 2 === 0) {
    createImage(svgDataUrl(demoImages[0].svg), "photo", { x: 332, y: 64, w: 156, h: 118 });
    createImage(svgDataUrl(demoImages[1].svg), "photo", { x: 42, y: 310, w: 170, h: 188 });
    createImage(svgDataUrl(demoImages[2].svg), "photo", { x: 350, y: 550, w: 142, h: 106 });
    createText(top, "subtitle", { x: 68, y: 285, w: 405, size: 30 });
    createText(title, "brush", { x: 18, y: 344, w: 505, size: 61, bg: "#e7e2d7", alpha: 85 });
    createText(paragraphs[0] || "先行动，再思考。", "highlight", { x: 22, y: 36, w: 310, size: 26, bg: "#fff1a5", alpha: 72 });
    createText(paragraphs[1] || "很多问题会在行动里变清楚。", "note", { x: 22, y: 120, w: 320, size: 24, bg: "#ffddea", alpha: 68 });
    createText((list.length ? list : ["难过=该运动了", "焦虑=该接触大自然"]).join("\n"), "torn", {
      x: 242,
      y: 302,
      w: 260,
      size: 26,
      bg: "#ffffff",
      alpha: 100,
    });
    createText(paragraphs.slice(2).join("\n\n") || "把想法写下来，不要让它们只在脑子里打转。", "note", {
      x: 28,
      y: 545,
      w: 300,
      size: 22,
      bg: "#ffe2ec",
      alpha: 68,
    });
  } else {
    createText(title, "brush gray-strip", { x: 28, y: 28, w: 290, size: 42, bg: "#cfcfca", alpha: 88 });
    createText(paragraphs[0] || "停止思考，先去行动。", "highlight", { x: 32, y: 116, w: 450, size: 25, bg: "#fff1a5", alpha: 70 });
    createImage(svgDataUrl(demoImages[0].svg), "photo", { x: 333, y: 80, w: 170, h: 126 });
    createText(paragraphs[1] || "行动起来以后，大脑才会为了解决问题而运转。", "note", {
      x: 6,
      y: 190,
      w: 315,
      size: 24,
      bg: "#ffe2ec",
      alpha: 70,
    });
    createImage(svgDataUrl(demoImages[1].svg), "photo", { x: 42, y: 344, w: 170, h: 190 });
    createText((list.length ? list : ["难过=该运动了", "混乱=该看书"]).join("\n"), "torn", {
      x: 240,
      y: 320,
      w: 260,
      size: 24,
      bg: "#ffffff",
      alpha: 100,
    });
    createText(top, "brush gray-strip", { x: 10, y: 584, w: 318, size: 32, bg: "#cfcfca", alpha: 88 });
    createText(paragraphs.slice(2).join("\n\n") || "真正的休息，是让大脑从被动接收里出来。", "note", {
      x: 24,
      y: 634,
      w: 330,
      size: 20,
      bg: "#ffe2ec",
      alpha: 72,
    });
    createImage(svgDataUrl(demoImages[2].svg), "photo", { x: 364, y: 602, w: 138, h: 104 });
  }
}

function addUploadedImages(files) {
  [...files].forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = () => {
      createImage(reader.result, "photo", {
        x: 42 + index * 34,
        y: 72 + index * 34,
        w: 160,
        h: 120,
      });
    };
    reader.readAsDataURL(file);
  });
}

async function exportPng() {
  clearSelection();
  const clone = poster.cloneNode(true);
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.boxShadow = "none";
  clone.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));

  let css = "";
  try {
    css = await fetch("./styles.css").then((response) => response.text());
  } catch {
    statusText.textContent = "导出需要通过本地服务打开页面";
  }
  const style = document.createElement("style");
  style.textContent = css;
  clone.prepend(style);
  const html = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 540 720"><foreignObject width="540" height="720">${html}</foreignObject></svg>`;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = `xhs-collage-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHex(value) {
  if (!value) return "#171717";
  if (value.startsWith("#")) return value;
  const match = value.match(/\d+/g);
  if (!match) return "#171717";
  return `#${match
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

document.querySelector("#generateBtn").addEventListener("click", buildPoster);
document.querySelector("#shuffleBtn").addEventListener("click", () => {
  layoutSeed += 1;
  buildPoster();
});
document.querySelector("#imageInput").addEventListener("change", (event) => {
  addUploadedImages(event.target.files);
});
document.querySelector("#addTextBtn").addEventListener("click", () => {
  createText("双击右侧修改文字", "note", { x: 80, y: 90, w: 260, size: 26, bg: "#ffe2ec", alpha: 70 });
});
document.querySelector("#addNoteBtn").addEventListener("click", () => {
  createText("新的便签\n可以拖到任意位置", "torn", { x: 145, y: 160, w: 245, size: 24, bg: "#ffffff", alpha: 100 });
});
document.querySelector("#exportBtn").addEventListener("click", exportPng);
document.querySelector("#bringForward").addEventListener("click", () => {
  if (!selected) return;
  selected.style.zIndex = String(zCounter++);
});
document.querySelector("#deleteBtn").addEventListener("click", () => {
  if (!selected) return;
  selected.remove();
  clearSelection();
});

editText.addEventListener("input", () => {
  if (selected) selected.textContent = editText.value;
});
fontSize.addEventListener("input", () => {
  if (selected) selected.style.fontSize = `${fontSize.value}px`;
});
boxWidth.addEventListener("input", () => {
  if (selected) selected.style.width = `${boxWidth.value}px`;
});
textColor.addEventListener("input", () => {
  if (selected) selected.style.color = textColor.value;
});
bgColor.addEventListener("input", () => {
  if (!selected) return;
  selected.dataset.bgHex = bgColor.value;
  selected.style.backgroundColor = hexToRgba(bgColor.value, Number(bgAlpha.value) / 100);
});
bgAlpha.addEventListener("input", () => {
  if (!selected) return;
  selected.dataset.bgAlpha = bgAlpha.value;
  selected.style.backgroundColor = hexToRgba(bgColor.value, Number(bgAlpha.value) / 100);
});
poster.addEventListener("click", clearSelection);

buildPoster();
