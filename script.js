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
const draftInput = document.querySelector("#draftInput");
const controls = [editText, fontSize, boxWidth, textColor, bgColor, bgAlpha, shapeSelect, elementFont];

const PAGE_W = 540;
const PAGE_H = 720;
const PAGE_BOTTOM = 670;
const SHAPES = ["plain-block", "note", "highlight", "torn", "gray-strip", "soft-card", "underline"];
const FONT_CLASSES = ["font-cute", "font-hand", "font-serif", "font-clean"];

let selectedItems = new Set();
let activePage = null;
let zCounter = 20;
let activePalette = "cream";
let activeStyle = "cream";
let suppressClickSelection = null;

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
  let title = "状态差自救指南";
  let top = "小红书 Plog";
  let rest = lines;
  const titleLineIndex = lines.findIndex((line) => /^【标题】/.test(line));
  if (titleLineIndex >= 0) {
    title = lines[titleLineIndex].replace(/^【标题】\s*/, "").trim() || title;
    top = "周末 Plog | 快乐实录";
    rest = lines.filter((_, index) => index !== titleLineIndex);
  } else {
    top = lines[0] || top;
    title = lines[1] || title;
    rest = lines.slice(2);
  }
  return { top, title, blocks: normalizeBlocks(rest) };
}

function normalizeBlocks(lines) {
  const blocks = [];
  let currentHeading = "";
  let currentLines = [];
  lines.forEach((line) => {
    if (isSectionHeading(line)) {
      if (currentHeading || currentLines.length) {
        blocks.push({ heading: currentHeading, body: currentLines.join("\n") });
      }
      currentHeading = line;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  });
  if (currentHeading || currentLines.length) {
    blocks.push({ heading: currentHeading, body: currentLines.join("\n") });
  }
  if (!blocks.length) {
    blocks.push({ heading: "", body: "停止思考，先去行动。不要复杂的想，拥抱变化，行动了大脑就会给你提供办法。" });
  }
  return blocks;
}

function isSectionHeading(line) {
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}]?[\uFE0F]?\s*[\u4e00-\u9fa5A-Za-z0-9]+[：:]/u.test(line);
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
    if (suppressClickSelection === el) {
      suppressClickSelection = null;
      return;
    }
    select(el, { add: event.ctrlKey || event.metaKey });
  });
}

function startDrag(event) {
  const el = event.currentTarget;
  const page = el.closest(".poster");
  setActivePage(page);
  if (!selectedItems.has(el)) {
    select(el, { add: event.ctrlKey || event.metaKey });
    suppressClickSelection = el;
  }
  const dragged = [...selectedItems].filter((item) => item.closest(".poster") === page);
  const startX = event.clientX;
  const startY = event.clientY;
  const posterRect = page.getBoundingClientRect();
  const scale = posterRect.width / PAGE_W;
  const starts = dragged.map((item) => {
    const rect = item.getBoundingClientRect();
    return {
      item,
      left: (rect.left - posterRect.left) / scale,
      top: (rect.top - posterRect.top) / scale,
    };
  });
  el.setPointerCapture(event.pointerId);
  function move(moveEvent) {
    const dx = (moveEvent.clientX - startX) / scale;
    const dy = (moveEvent.clientY - startY) / scale;
    starts.forEach(({ item, left, top }) => {
      item.style.left = `${Math.max(-20, Math.min(PAGE_W - 20, left + dx))}px`;
      item.style.top = `${Math.max(-20, Math.min(PAGE_H - 20, top + dy))}px`;
    });
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

function select(el, { add = false } = {}) {
  if (!add) clearSelection(false);
  if (add && selectedItems.has(el)) {
    el.classList.remove("selected");
    selectedItems.delete(el);
  } else {
    el.classList.add("selected");
    selectedItems.add(el);
  }
  setActivePage(el.closest(".poster"));
  syncControls();
}

function clearSelection(update = true) {
  selectedItems.forEach((item) => item.classList.remove("selected"));
  selectedItems.clear();
  if (update) syncControls();
}

function syncControls() {
  const selected = primarySelection();
  const count = selectedItems.size;
  statusText.textContent = count ? `已选中 ${count} 个元素，可拖拽或批量调整` : "选择元素后可在右侧调整";
  const hasSelected = Boolean(selected);
  controls.forEach((control) => {
    control.disabled = !hasSelected;
  });
  document.querySelector("#bringForward").disabled = !hasSelected;
  document.querySelector("#deleteBtn").disabled = !hasSelected;
  if (!selected) {
    editText.value = "";
    return;
  }
  const isText = selected.classList.contains("text-item");
  editText.disabled = !isText || count > 1;
  shapeSelect.disabled = !isText;
  elementFont.disabled = !isText;
  editText.value = isText && count === 1 ? selected.textContent : "";
  fontSize.value = Math.min(parseInt(selected.style.fontSize, 10) || 28, Number(fontSize.max));
  boxWidth.value = Math.min(parseInt(selected.style.width, 10) || 220, Number(boxWidth.max));
  textColor.value = rgbToHex(selected.style.color) || currentPalette().ink;
  bgColor.value = selected.dataset.bgHex || "#ffffff";
  bgAlpha.value = selected.dataset.bgAlpha || "0";
  shapeSelect.value = getElementShape(selected);
  elementFont.value = selected.dataset.fontPreset || "";
}

function primarySelection() {
  return [...selectedItems][selectedItems.size - 1] || null;
}

function selectedTextItems() {
  return [...selectedItems].filter((item) => item.classList.contains("text-item"));
}

function buildPoster() {
  const { top, title, blocks } = parseInput(sourceText.value);
  const palette = currentPalette();
  pages.innerHTML = "";
  clearSelection(false);
  zCounter = 20;
  let page = createPage();
  let y = 28;
  const margin = 28;
  const gap = 14;
  const contentWidth = 484;

  const topEl = createText(top, "subtitle plain-block", {
    page,
    x: margin,
    y,
    w: contentWidth,
    size: 21,
    color: palette.muted,
    z: 130,
  });
  y += renderedHeight(topEl) + 8;

  const titleEl = createText(title, "brush title-block gray-strip", {
    page,
    x: 16,
    y,
    w: 508,
    size: fitTitleSize(title),
    bg: palette.titleBg,
    alpha: 88,
    z: 200,
  });
  y += renderedHeight(titleEl) + 22;

  const flowBlocks = makeFlowBlocks(blocks);
  flowBlocks.forEach((block) => {
    const chunks = splitTextToFit(block, page, PAGE_BOTTOM - 52);
    chunks.forEach((chunk) => {
      const measured = measureText(chunk.text, block.shape, {
        page,
        w: block.width || contentWidth,
        size: block.size,
      });
      if (y + measured > PAGE_BOTTOM) {
        addPageNumber(page);
        page = createPage();
        y = 34;
        const continued = createText(`${title} / 续页`, "subtitle plain-block", {
          page,
          x: margin,
          y,
          w: contentWidth,
          size: 18,
          color: palette.muted,
        });
        y += renderedHeight(continued) + 14;
      }
      const el = createText(chunk.text, block.shape, {
        page,
        x: block.x || margin,
        y,
        w: block.width || contentWidth,
        size: block.size,
        bg: bgForShape(block.shape),
        alpha: alphaForShape(block.shape),
      });
      y += renderedHeight(el) + gap;
    });
  });

  addPageNumber(page);
  setActivePage(pages.querySelector(".poster"));
  syncControls();
  statusText.textContent = `已生成 ${pages.children.length} 页，使用真实高度分页避免遮盖`;
}

function makeFlowBlocks(blocks) {
  return blocks.flatMap((block, index) => {
    const result = [];
    if (block.heading) {
      result.push({ text: block.heading, shape: index % 2 === 0 ? "highlight" : "gray-strip", size: 24 });
    }
    if (block.body) {
      result.push({
        text: block.body,
        shape: index % 3 === 1 ? "soft-card" : index % 3 === 2 ? "plain-block" : "note",
        size: 20,
      });
    }
    return result;
  });
}

function splitTextToFit(block, page, maxHeight) {
  if (measureText(block.text, block.shape, { page, w: block.width || 484, size: block.size }) <= maxHeight) {
    return [{ text: block.text }];
  }
  const chunks = [];
  let current = "";
  tokenizeText(block.text).forEach((token) => {
    const next = current ? `${current}${token}` : token.trimStart();
    if (current && measureText(next, block.shape, { page, w: block.width || 484, size: block.size }) > maxHeight) {
      chunks.push({ text: current.trim() });
      current = token.trimStart();
    } else {
      current = next;
    }
  });
  if (current.trim()) chunks.push({ text: current.trim() });
  return chunks.length ? chunks : [{ text: block.text }];
}

function tokenizeText(text) {
  const byLine = text.split("\n").flatMap((line) => {
    const parts = line.match(/[^。！？!?；;，,]+[。！？!?；;，,]?/g) || [line];
    return parts.map((part, index) => (index === parts.length - 1 ? `${part}\n` : part));
  });
  return byLine.length ? byLine : [text];
}

function measureText(text, shape, { page, w, size }) {
  const probe = createText(text, shape, {
    page,
    x: -2000,
    y: -2000,
    w,
    size,
    bg: bgForShape(shape),
    alpha: alphaForShape(shape),
  });
  const height = renderedHeight(probe);
  probe.remove();
  return height;
}

function renderedHeight(el) {
  return Math.ceil(Math.max(el.scrollHeight, el.getBoundingClientRect().height));
}

function fitTitleSize(title) {
  if (title.length <= 9) return 56;
  if (title.length <= 16) return 46;
  if (title.length <= 24) return 38;
  return 32;
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
  makeInteractive(number);
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
    version: 3,
    sourceText: sourceText.value,
    activePalette,
    activeStyle,
    fontPreset: fontPreset.value,
    stylePreset: stylePreset.value,
    pagesHtml: pages.innerHTML,
  };
  downloadTextFile(`xhs-draft-${Date.now()}.json`, JSON.stringify(draft, null, 2));
  statusText.textContent = "草稿 JSON 文件已下载";
}

function loadDraftFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const draft = JSON.parse(reader.result);
      sourceText.value = draft.sourceText || sourceText.value;
      activePalette = draft.activePalette || "cream";
      activeStyle = draft.activeStyle || draft.stylePreset || activePalette;
      stylePreset.value = activeStyle;
      fontPreset.value = draft.fontPreset || palettes[activeStyle]?.font || fontPreset.value;
      pages.innerHTML = draft.pagesHtml || "";
      restoreInteractiveItems();
      renderPalettes();
      document.querySelectorAll(".poster").forEach((page) => {
        applyPosterTheme(page);
        applyFontPreset(page);
      });
      setActivePage(pages.querySelector(".poster") || createPage());
      clearSelection();
      statusText.textContent = "草稿文件已载入";
    } catch {
      statusText.textContent = "草稿文件格式不正确";
    }
  };
  reader.readAsText(file);
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function restoreInteractiveItems() {
  pages.querySelectorAll(".item").forEach((el) => makeInteractive(el));
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
    button.addEventListener("click", () => applyPalettePreset(key));
    paletteList.append(button);
  });
}

function applyStylePreset(key) {
  activeStyle = key;
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

function applyPalettePreset(key) {
  activePalette = key;
  renderPalettes();
  document.querySelectorAll(".poster").forEach((page) => applyPosterTheme(page));
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
  syncControls();
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

function duplicateSelection() {
  const clones = [...selectedItems].map((item) => {
    const clone = item.cloneNode(true);
    clone.classList.remove("selected");
    clone.style.left = `${(parseFloat(item.style.left) || 0) + 18}px`;
    clone.style.top = `${(parseFloat(item.style.top) || 0) + 18}px`;
    clone.style.zIndex = String(zCounter++);
    makeInteractive(clone);
    item.closest(".poster").append(clone);
    return clone;
  });
  clearSelection(false);
  clones.forEach((clone) => {
    clone.classList.add("selected");
    selectedItems.add(clone);
  });
  syncControls();
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
document.querySelector("#imageInput").addEventListener("change", (event) => addUploadedImages(event.target.files));
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
document.querySelector("#loadDraftBtn").addEventListener("click", () => draftInput.click());
draftInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) loadDraftFile(file);
  draftInput.value = "";
});
document.querySelector("#bringForward").addEventListener("click", () => {
  selectedItems.forEach((item) => {
    const isTitle = item.classList.contains("title-block");
    item.style.zIndex = String(isTitle ? 200 : Math.min(zCounter++, 190));
  });
});
document.querySelector("#deleteBtn").addEventListener("click", () => {
  selectedItems.forEach((item) => item.remove());
  clearSelection();
});

editText.addEventListener("input", () => {
  const selected = primarySelection();
  if (selected && selectedItems.size === 1) selected.textContent = editText.value;
});
fontSize.addEventListener("input", () => {
  selectedItems.forEach((item) => {
    item.style.fontSize = `${fontSize.value}px`;
  });
});
boxWidth.addEventListener("input", () => {
  selectedItems.forEach((item) => {
    item.style.width = `${boxWidth.value}px`;
  });
});
shapeSelect.addEventListener("change", () => {
  selectedTextItems().forEach((item) => setElementShape(item, shapeSelect.value));
});
elementFont.addEventListener("change", () => {
  selectedTextItems().forEach((item) => setElementFont(item, elementFont.value));
});
textColor.addEventListener("input", () => {
  selectedItems.forEach((item) => {
    item.style.color = textColor.value;
  });
});
bgColor.addEventListener("input", () => {
  selectedItems.forEach((item) => setElementBg(item, bgColor.value, Number(bgAlpha.value)));
});
bgAlpha.addEventListener("input", () => {
  selectedItems.forEach((item) => setElementBg(item, bgColor.value, Number(bgAlpha.value)));
});
fontPreset.addEventListener("change", () => applyFontPreset());
stylePreset.addEventListener("change", () => applyStylePreset(stylePreset.value));
document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selectedItems.size) {
    event.preventDefault();
    duplicateSelection();
  }
});

renderPalettes();
applyStylePreset(stylePreset.value);
buildPoster();
