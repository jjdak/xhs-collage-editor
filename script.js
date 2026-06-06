const pages = document.querySelector("#pages");
const sourceText = document.querySelector("#sourceText");
const statusText = document.querySelector("#statusText");
const pageStatus = document.querySelector("#pageStatus");
const editText = document.querySelector("#editText");
const fontSize = document.querySelector("#fontSize");
const boxWidth = document.querySelector("#boxWidth");
const textColor = document.querySelector("#textColor");
const bgColor = document.querySelector("#bgColor");
const bgAlpha = document.querySelector("#bgAlpha");
const fontPreset = document.querySelector("#fontPreset");
const stylePreset = document.querySelector("#stylePreset");
const paletteList = document.querySelector("#paletteList");
const shapeSelect = document.querySelector("#shapeSelect");
const elementFont = document.querySelector("#elementFont");
const controls = [
  editText,
  fontSize,
  boxWidth,
  textColor,
  bgColor,
  bgAlpha,
  shapeSelect,
  elementFont,
];

const DRAFT_KEY = "xhs-collage-editor-draft-v2";
const PAGE_W = 540;
const PAGE_H = 720;
const PAGE_BOTTOM = 688;
const SHAPES = ["plain-block", "note", "highlight", "torn", "gray-strip", "soft-card", "underline"];
const FONT_CLASSES = ["font-cute", "font-hand", "font-serif", "font-clean"];

let selected = null;
let activePage = null;
let zCounter = 20;
let activePalette = "cream";

const palettes = {
  cream: {
    name: "温柔奶油",
    font: "cute",
    paper: "#fbf6ec",
    ink: "#3a3028",
    muted: "#8b7b6c",
    titleBg: "#e9dcc8",
    noteBg: "#f4e9da",
    highlightBg: "#efe1c5",
    accent: "#b99b7b",
  },
  xhsCard: {
    name: "小红书卡片",
    font: "clean",
    paper: "#fffdfb",
    ink: "#171717",
    muted: "#6d6963",
    titleBg: "#f4d7df",
    noteBg: "#ffe8ee",
    highlightBg: "#fff0c8",
    accent: "#e84b73",
  },
  japanMag: {
    name: "日系杂志",
    font: "serif",
    paper: "#f8f4ea",
    ink: "#24211d",
    muted: "#83786a",
    titleBg: "#ddd4c3",
    noteBg: "#eee4d2",
    highlightBg: "#d9e2d2",
    accent: "#9a7f63",
  },
  morandi: {
    name: "莫兰迪",
    font: "hand",
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
    font: "clean",
    paper: "#fffaf0",
    ink: "#111111",
    muted: "#55524b",
    titleBg: "#f2d04f",
    noteBg: "#f5d7d7",
    highlightBg: "#b9d7ea",
    accent: "#d64032",
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

function createPage() {
  const page = document.createElement("article");
  page.className = `poster font-${fontPreset.value}`;
  page.setAttribute("aria-label", `海报第 ${pages.children.length + 1} 页`);
  page.addEventListener("click", () => {
    setActivePage(page);
    clearSelection();
  });
  pages.append(page);
  applyPosterTheme(page);
  setActivePage(page);
  return page;
}

function setActivePage(page) {
  if (!page) return;
  activePage = page;
  document.querySelectorAll(".poster").forEach((poster) => {
    poster.classList.toggle("active-page", poster === activePage);
  });
  updatePageStatus();
}

function currentPage() {
  if (!activePage || !pages.contains(activePage)) return pages.querySelector(".poster") || createPage();
  return activePage;
}

function createText(text, className, options = {}) {
  const el = document.createElement("div");
  el.className = `item text-item ${className || ""}`.trim();
  el.textContent = text;
  applyBox(el, options);
  makeInteractive(el);
  (options.page || currentPage()).append(el);
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
  currentPage().append(el);
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
    font = "",
  } = options;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  if (h) el.style.height = `${h}px`;
  el.style.fontSize = `${size}px`;
  el.style.color = color;
  if (font) setElementFont(el, font);
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
  const page = el.closest(".poster");
  setActivePage(page);
  select(el);
  const startX = event.clientX;
  const startY = event.clientY;
  const rect = el.getBoundingClientRect();
  const posterRect = page.getBoundingClientRect();
  const scale = posterRect.width / PAGE_W;
  const initialLeft = (rect.left - posterRect.left) / scale;
  const initialTop = (rect.top - posterRect.top) / scale;

  el.setPointerCapture(event.pointerId);
  function move(moveEvent) {
    const nextLeft = initialLeft + (moveEvent.clientX - startX) / scale;
    const nextTop = initialTop + (moveEvent.clientY - startY) / scale;
    el.style.left = `${Math.max(-20, Math.min(PAGE_W - 20, nextLeft))}px`;
    el.style.top = `${Math.max(-20, Math.min(PAGE_H - 20, nextTop))}px`;
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
  setActivePage(selected.closest(".poster"));
  statusText.textContent = "已选中元素，可拖拽或调整样式";
  const isText = selected.classList.contains("text-item");
  controls.forEach((control) => {
    control.disabled = false;
  });
  editText.disabled = !isText;
  shapeSelect.disabled = !isText;
  elementFont.disabled = !isText;
  editText.value = isText ? selected.textContent : "";
  fontSize.value = Math.min(parseInt(selected.style.fontSize, 10) || 28, Number(fontSize.max));
  boxWidth.value = Math.min(parseInt(selected.style.width, 10) || 220, Number(boxWidth.max));
  textColor.value = rgbToHex(selected.style.color) || currentPalette().ink;
  bgColor.value = selected.dataset.bgHex || "#ffffff";
  bgAlpha.value = selected.dataset.bgAlpha || "0";
  shapeSelect.value = getElementShape(selected);
  elementFont.value = selected.dataset.fontPreset || "";
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
  pages.innerHTML = "";
  selected = null;
  zCounter = 20;
  let page = createPage();
  let y = 28;
  const margin = 28;
  const gap = 14;
  const contentWidth = 484;

  const topH = estimateTextHeight(top, 24, contentWidth, 1.25, 16);
  createText(top, "subtitle plain-block", {
    page,
    x: margin,
    y,
    w: contentWidth,
    size: 24,
    color: palette.muted,
    z: 130,
  });
  y += topH + 8;

  const titleSize = fitTitleSize(title);
  const titleH = estimateTextHeight(title, titleSize, contentWidth, 1.08, 24);
  createText(title, "brush title-block gray-strip", {
    page,
    x: 16,
    y,
    w: 508,
    size: titleSize,
    bg: palette.titleBg,
    alpha: 88,
    z: 200,
  });
  y += titleH + 22;

  const blocks = [];
  if (paragraphs[0]) blocks.push({ text: paragraphs[0], shape: "highlight", size: 25 });
  paragraphs.slice(1).forEach((paragraph, index) => {
    blocks.push({ text: paragraph, shape: index % 2 ? "plain-block" : "note", size: 21 });
  });
  if (list.length) blocks.push({ text: list.join("\n"), shape: "torn", size: list.length > 6 ? 21 : 24, width: 392, x: 74 });
  if (!blocks.length) {
    blocks.push({
      text: "停止思考，先去行动。不要复杂的想，拥抱变化，行动了大脑就会给你提供办法。",
      shape: "highlight",
      size: 25,
    });
  }

  splitOversizedBlocks(blocks).forEach((block) => {
    const metrics = blockMetrics(block.text, block.shape, block.size, block.width || contentWidth);
    if (y + metrics.height > PAGE_BOTTOM) {
      addPageNumber(page);
      page = createPage();
      y = 34;
      createText(`${title} / 续页`, "subtitle plain-block", {
        page,
        x: margin,
        y,
        w: contentWidth,
        size: 20,
        color: palette.muted,
      });
      y += 42;
    }
    createText(block.text, block.shape, {
      page,
      x: block.x || margin,
      y,
      w: block.width || contentWidth,
      size: block.size,
      bg: bgForShape(block.shape),
      alpha: alphaForShape(block.shape),
    });
    y += metrics.height + gap;
  });

  addPageNumber(page);
  setActivePage(pages.querySelector(".poster"));
  statusText.textContent = `已生成 ${pages.children.length} 页，内容过多会自动分页`;
}

function splitOversizedBlocks(blocks) {
  const maxBlockHeight = 560;
  return blocks.flatMap((block) => splitBlock(block, maxBlockHeight));
}

function splitBlock(block, maxHeight) {
  const width = block.width || 484;
  if (blockMetrics(block.text, block.shape, block.size, width).height <= maxHeight) {
    return [block];
  }
  const chunks = [];
  let current = "";
  tokenizeText(block.text).forEach((token) => {
    const next = current ? `${current}${token}` : token.trimStart();
    if (current && blockMetrics(next, block.shape, block.size, width).height > maxHeight) {
      chunks.push({ ...block, text: current.trim() });
      current = token.trimStart();
    } else {
      current = next;
    }
  });
  if (current.trim()) chunks.push({ ...block, text: current.trim() });
  return chunks.length ? chunks : [block];
}

function tokenizeText(text) {
  const bySentence = text.match(/[^。！？!?；;\n]+[。！？!?；;\n]?/g);
  if (bySentence && bySentence.length > 1) return bySentence;
  const tokens = [];
  for (let index = 0; index < text.length; index += 38) {
    tokens.push(text.slice(index, index + 38));
  }
  return tokens;
}

function blockMetrics(text, shape, size, width) {
  const padding = shape === "torn" ? 44 : shape === "plain-block" || shape === "underline" ? 8 : 26;
  const lineHeight = shape === "torn" ? 1.48 : 1.52;
  return { height: estimateTextHeight(text, size, width, lineHeight, padding) };
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

function addPageNumber(page) {
  if (page.querySelector(".page-number")) return;
  const number = document.createElement("div");
  number.className = "item text-item page-number plain-block";
  number.textContent = `${[...pages.children].indexOf(page) + 1}`;
  number.style.left = "496px";
  number.style.top = "680px";
  number.style.width = "22px";
  number.style.fontSize = "16px";
  number.style.color = currentPalette().muted;
  number.style.zIndex = "12";
  page.append(number);
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
  const posters = [...document.querySelectorAll(".poster")];
  const css = await fetchCss();
  for (const [index, poster] of posters.entries()) {
    await exportOnePoster(poster, css, index + 1);
  }
  statusText.textContent = `已导出 ${posters.length} 张 PNG`;
}

function exportOnePoster(poster, css, pageNo) {
  return new Promise((resolve) => {
    const clone = poster.cloneNode(true);
    clone.classList.remove("active-page");
    clone.style.transform = "none";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));

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
      link.download = `xhs-collage-p${String(pageNo).padStart(2, "0")}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      resolve();
    };
    image.onerror = resolve;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

async function fetchCss() {
  try {
    return await fetch("./styles.css").then((response) => response.text());
  } catch {
    statusText.textContent = "导出需要通过本地服务打开页面";
    return "";
  }
}

function saveDraft() {
  const draft = {
    sourceText: sourceText.value,
    activePalette,
    fontPreset: fontPreset.value,
    stylePreset: stylePreset.value,
    pagesHtml: pages.innerHTML,
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  statusText.textContent = "草稿已保存到本机浏览器";
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) {
    statusText.textContent = "没有找到已保存草稿";
    return;
  }
  const draft = JSON.parse(raw);
  sourceText.value = draft.sourceText || sourceText.value;
  activePalette = draft.activePalette || activePalette;
  fontPreset.value = draft.fontPreset || fontPreset.value;
  stylePreset.value = draft.stylePreset || activePalette;
  pages.innerHTML = draft.pagesHtml || "";
  restoreInteractiveItems();
  renderPalettes();
  document.querySelectorAll(".poster").forEach((page) => {
    applyPosterTheme(page);
    applyFontPreset(page);
  });
  setActivePage(pages.querySelector(".poster") || createPage());
  statusText.textContent = "草稿已载入";
}

function restoreInteractiveItems() {
  pages.querySelectorAll(".item").forEach((el) => {
    makeInteractive(el);
  });
  pages.querySelectorAll(".poster").forEach((page) => {
    page.addEventListener("click", () => {
      setActivePage(page);
      clearSelection();
    });
  });
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
      applyStylePreset(key);
    });
    paletteList.append(button);
  });
}

function applyStylePreset(key) {
  activePalette = key;
  stylePreset.value = key;
  fontPreset.value = currentPalette().font;
  renderPalettes();
  document.querySelectorAll(".poster").forEach((page) => {
    applyPosterTheme(page);
    applyFontPreset(page);
  });
  applyPaletteToPoster();
}

function applyPaletteToPoster() {
  const palette = currentPalette();
  document.querySelectorAll(".text-item").forEach((el) => {
    if (el.classList.contains("page-number")) el.style.color = palette.muted;
    else el.style.color = palette.ink;
    if (el.classList.contains("title-block") || el.classList.contains("gray-strip")) {
      setElementBg(el, palette.titleBg, 88);
    }
    if (el.classList.contains("note") || el.classList.contains("soft-card")) {
      setElementBg(el, palette.noteBg, 70);
    }
    if (el.classList.contains("highlight")) setElementBg(el, palette.highlightBg, 76);
  });
  if (selected) select(selected);
}

function applyPosterTheme(page) {
  page.style.backgroundColor = currentPalette().paper;
}

function applyFontPreset(page = null) {
  const targets = page ? [page] : [...document.querySelectorAll(".poster")];
  targets.forEach((poster) => {
    poster.classList.remove("font-cute", "font-hand", "font-serif", "font-clean");
    poster.classList.add(`font-${fontPreset.value}`);
  });
}

function currentPalette() {
  return palettes[activePalette];
}

function bgForShape(shape) {
  const palette = currentPalette();
  if (shape === "highlight") return palette.highlightBg;
  if (shape === "note" || shape === "soft-card") return palette.noteBg;
  if (shape === "gray-strip") return palette.titleBg;
  if (shape === "torn") return "#ffffff";
  return "#ffffff";
}

function alphaForShape(shape) {
  if (shape === "plain-block" || shape === "underline") return 0;
  if (shape === "torn") return 100;
  if (shape === "gray-strip") return 88;
  return 72;
}

function setElementBg(el, bg, alpha) {
  el.dataset.bgHex = bg;
  el.dataset.bgAlpha = String(alpha);
  el.style.backgroundColor = hexToRgba(bg, alpha / 100);
}

function setElementShape(el, shape) {
  SHAPES.forEach((shapeClass) => el.classList.remove(shapeClass));
  el.classList.add(shape);
  setElementBg(el, bgForShape(shape), alphaForShape(shape));
}

function getElementShape(el) {
  return SHAPES.find((shape) => el.classList.contains(shape)) || "plain-block";
}

function setElementFont(el, font) {
  FONT_CLASSES.forEach((fontClass) => el.classList.remove(fontClass));
  el.dataset.fontPreset = font;
  if (font) el.classList.add(`font-${font}`);
}

function updatePageStatus() {
  const posters = [...document.querySelectorAll(".poster")];
  const current = posters.indexOf(activePage) + 1 || 1;
  pageStatus.textContent = `第 ${current} / ${posters.length || 1} 页`;
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
  pages.innerHTML = "";
  createPage();
  clearSelection();
});
document.querySelector("#addPageBtn").addEventListener("click", () => {
  createPage();
  statusText.textContent = "已添加空白页";
});
document.querySelector("#imageInput").addEventListener("change", (event) => {
  addUploadedImages(event.target.files);
});
document.querySelector("#addTextBtn").addEventListener("click", () => {
  createText("在右侧修改文字", "note", {
    x: 80,
    y: 90,
    w: 260,
    size: 24,
    bg: currentPalette().noteBg,
    alpha: 70,
  });
});
document.querySelector("#addNoteBtn").addEventListener("click", () => {
  createText("新的便签\n可以拖到任意位置", "torn", {
    x: 145,
    y: 160,
    w: 245,
    size: 23,
    bg: "#ffffff",
    alpha: 100,
  });
});
document.querySelector("#exportBtn").addEventListener("click", exportPng);
document.querySelector("#saveDraftBtn").addEventListener("click", saveDraft);
document.querySelector("#loadDraftBtn").addEventListener("click", loadDraft);
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
shapeSelect.addEventListener("change", () => {
  if (selected) setElementShape(selected, shapeSelect.value);
});
elementFont.addEventListener("change", () => {
  if (selected) setElementFont(selected, elementFont.value);
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
fontPreset.addEventListener("change", () => {
  applyFontPreset();
});
stylePreset.addEventListener("change", () => {
  applyStylePreset(stylePreset.value);
});

renderPalettes();
applyStylePreset(stylePreset.value);
buildPoster();
