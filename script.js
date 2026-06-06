const poster = document.querySelector("#poster");
const sourceText = document.querySelector("#sourceText");
const statusText = document.querySelector("#statusText");
const editText = document.querySelector("#editText");
const fontSize = document.querySelector("#fontSize");
const boxWidth = document.querySelector("#boxWidth");
const textColor = document.querySelector("#textColor");
const bgColor = document.querySelector("#bgColor");
const bgAlpha = document.querySelector("#bgAlpha");
const fontPreset = document.querySelector("#fontPreset");
const paletteList = document.querySelector("#paletteList");
const controls = [editText, fontSize, boxWidth, textColor, bgColor, bgAlpha];

let selected = null;
let zCounter = 20;
let activePalette = "editorial";

const palettes = {
  editorial: {
    name: "杂志黑粉",
    paper: "#fffdfb",
    ink: "#171717",
    muted: "#6d6963",
    titleBg: "#e4dfd4",
    noteBg: "#ffe4ec",
    highlightBg: "#fff0a8",
    accent: "#e95f8b",
  },
  morandi: {
    name: "莫兰迪",
    paper: "#fbfaf6",
    ink: "#2b2d2f",
    muted: "#7d817b",
    titleBg: "#d8ddd3",
    noteBg: "#eadbd6",
    highlightBg: "#e9dfb7",
    accent: "#9c6f64",
  },
  bauhaus: {
    name: "包豪斯",
    paper: "#fffaf0",
    ink: "#111111",
    muted: "#55524b",
    titleBg: "#f2d04f",
    noteBg: "#f5d7d7",
    highlightBg: "#b9d7ea",
    accent: "#d64032",
  },
  macaron: {
    name: "马卡龙",
    paper: "#fffefd",
    ink: "#25313c",
    muted: "#71808c",
    titleBg: "#d8eff0",
    noteBg: "#ffe0ee",
    highlightBg: "#fff1b6",
    accent: "#7cc7c2",
  },
  gallery: {
    name: "画廊中性",
    paper: "#faf7f1",
    ink: "#1d1b18",
    muted: "#777068",
    titleBg: "#d6d0c5",
    noteBg: "#efe7dc",
    highlightBg: "#d7e4d2",
    accent: "#8e4f45",
  },
};

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
    color = currentPalette().ink,
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
  if (bg) setElementBg(el, bg, alpha);
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
  textColor.value = rgbToHex(selected.style.color) || currentPalette().ink;
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
  const palette = currentPalette();
  poster.innerHTML = "";
  selected = null;
  zCounter = 20;
  applyPosterTheme();

  let y = 28;
  const margin = 28;
  const gap = 14;
  const contentWidth = 484;

  const topH = estimateTextHeight(top, 25, contentWidth, 1.25, 16);
  createText(top, "subtitle", {
    x: margin,
    y,
    w: contentWidth,
    size: 25,
    color: palette.muted,
    z: 130,
  });
  y += topH + 8;

  const titleSize = fitTitleSize(title);
  const titleH = estimateTextHeight(title, titleSize, contentWidth, 1.08, 24);
  createText(title, "brush title-block", {
    x: 16,
    y,
    w: 508,
    size: titleSize,
    bg: palette.titleBg,
    alpha: 88,
    z: 200,
  });
  y += titleH + 22;

  const intro = paragraphs[0] || "停止思考，先去行动。不要复杂的想，拥抱变化，行动了大脑就会给你提供办法。";
  const introH = estimateTextHeight(intro, 26, contentWidth, 1.45, 20);
  createText(intro, "highlight", {
    x: margin,
    y,
    w: contentWidth,
    size: 26,
    bg: palette.highlightBg,
    alpha: 76,
  });
  y += introH + gap;

  const bodyBlocks = paragraphs.slice(1);
  if (bodyBlocks[0]) {
    y = addFlowBlock(bodyBlocks[0], "note", y, {
      x: margin,
      w: contentWidth,
      size: 23,
      bg: palette.noteBg,
      alpha: 70,
    });
  }

  if (list.length) {
    const listText = list.join("\n");
    y = addFlowBlock(listText, "torn", y, {
      x: 74,
      w: 392,
      size: list.length > 6 ? 22 : 25,
      bg: "#ffffff",
      alpha: 100,
    });
  }

  bodyBlocks.slice(1).forEach((paragraph, index) => {
    const isLast = index === bodyBlocks.length - 2;
    y = addFlowBlock(paragraph, isLast ? "note" : "plain-block", y, {
      x: margin,
      w: contentWidth,
      size: 21,
      bg: isLast ? palette.noteBg : "#ffffff",
      alpha: isLast ? 64 : 0,
    });
  });

  addAccentDots(Math.min(y + 6, 690), palette.accent);
  statusText.textContent = "已生成无内置图片版式，贴图请手动上传";
}

function addFlowBlock(text, className, y, options) {
  const height = estimateTextHeight(
    text,
    options.size,
    options.w,
    className === "torn" ? 1.48 : 1.52,
    className === "torn" ? 44 : 24,
  );
  if (y + height > 692) {
    const scale = Math.max(0.82, (692 - y) / height);
    options.size = Math.floor(options.size * scale);
  }
  createText(text, className, { ...options, y });
  return y + Math.min(height, 692 - y) + 16;
}

function estimateTextHeight(text, size, width, lineHeight = 1.45, padding = 0) {
  const charsPerLine = Math.max(6, Math.floor(width / (size * 0.9)));
  const lines = text
    .split("\n")
    .map((line) => Math.max(1, Math.ceil(line.length / charsPerLine)))
    .reduce((sum, lineCount) => sum + lineCount, 0);
  return Math.ceil(lines * size * lineHeight + padding);
}

function fitTitleSize(title) {
  if (title.length <= 7) return 62;
  if (title.length <= 10) return 54;
  return 46;
}

function addAccentDots(y, color) {
  const dotY = Math.min(y, 682);
  [32, 52, 72].forEach((x) => {
    const dot = document.createElement("div");
    dot.className = "item caption-dot";
    dot.style.left = `${x}px`;
    dot.style.top = `${dotY}px`;
    dot.style.backgroundColor = color;
    dot.style.zIndex = "15";
    poster.append(dot);
  });
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
    ctx.fillStyle = currentPalette().paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const link = document.createElement("a");
    link.download = `xhs-collage-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderPalettes() {
  paletteList.innerHTML = "";
  Object.entries(palettes).forEach(([key, palette]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `palette-button ${key === activePalette ? "active" : ""}`;
    button.innerHTML = `<span>${palette.name}</span><span class="swatches">${[
      palette.ink,
      palette.titleBg,
      palette.noteBg,
      palette.highlightBg,
      palette.accent,
    ]
      .map((color) => `<span class="swatch" style="background:${color}"></span>`)
      .join("")}</span>`;
    button.addEventListener("click", () => {
      activePalette = key;
      renderPalettes();
      applyPaletteToPoster();
    });
    paletteList.append(button);
  });
}

function applyPaletteToPoster() {
  const palette = currentPalette();
  applyPosterTheme();
  poster.querySelectorAll(".text-item").forEach((el) => {
    el.style.color = palette.ink;
    if (el.classList.contains("title-block")) setElementBg(el, palette.titleBg, 88);
    if (el.classList.contains("note")) setElementBg(el, palette.noteBg, 70);
    if (el.classList.contains("highlight")) setElementBg(el, palette.highlightBg, 76);
  });
  poster.querySelectorAll(".caption-dot").forEach((dot) => {
    dot.style.backgroundColor = palette.accent;
  });
  if (selected) select(selected);
}

function applyPosterTheme() {
  const palette = currentPalette();
  poster.style.backgroundColor = palette.paper;
}

function applyFontPreset() {
  poster.classList.remove("font-cute", "font-hand", "font-serif", "font-clean");
  poster.classList.add(`font-${fontPreset.value}`);
}

function currentPalette() {
  return palettes[activePalette];
}

function setElementBg(el, bg, alpha) {
  el.dataset.bgHex = bg;
  el.dataset.bgAlpha = String(alpha);
  el.style.backgroundColor = hexToRgba(bg, alpha / 100);
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
  if (!value) return currentPalette().ink;
  if (value.startsWith("#")) return value;
  const match = value.match(/\d+/g);
  if (!match) return currentPalette().ink;
  return `#${match
    .slice(0, 3)
    .map((n) => Number(n).toString(16).padStart(2, "0"))
    .join("")}`;
}

document.querySelector("#generateBtn").addEventListener("click", buildPoster);
document.querySelector("#clearBtn").addEventListener("click", () => {
  poster.innerHTML = "";
  clearSelection();
});
document.querySelector("#imageInput").addEventListener("change", (event) => {
  addUploadedImages(event.target.files);
});
document.querySelector("#addTextBtn").addEventListener("click", () => {
  createText("在右侧修改文字", "note", {
    x: 80,
    y: 90,
    w: 260,
    size: 26,
    bg: currentPalette().noteBg,
    alpha: 70,
  });
});
document.querySelector("#addNoteBtn").addEventListener("click", () => {
  createText("新的便签\n可以拖到任意位置", "torn", {
    x: 145,
    y: 160,
    w: 245,
    size: 24,
    bg: "#ffffff",
    alpha: 100,
  });
});
document.querySelector("#exportBtn").addEventListener("click", exportPng);
document.querySelector("#bringForward").addEventListener("click", () => {
  if (!selected) return;
  const isTitle = selected.classList.contains("title-block");
  selected.style.zIndex = String(isTitle ? 200 : Math.min(zCounter++, 190));
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
  setElementBg(selected, bgColor.value, Number(bgAlpha.value));
});
bgAlpha.addEventListener("input", () => {
  if (!selected) return;
  setElementBg(selected, bgColor.value, Number(bgAlpha.value));
});
fontPreset.addEventListener("change", applyFontPreset);
poster.addEventListener("click", clearSelection);

renderPalettes();
applyFontPreset();
buildPoster();
