/* ── DOM refs ── */
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
const boldToggle = document.querySelector("#boldToggle");
const undoBtn = document.querySelector("#undoBtn");
const redoBtn = document.querySelector("#redoBtn");
const controls = [editText, fontSize, boxWidth, textColor, bgColor, bgAlpha, shapeSelect, elementFont];

/* ── Constants ── */
const PAGE_W = 540;
const PAGE_H = 720;
const PAGE_BOTTOM = 670;
const SHAPES = ["plain-block", "note", "highlight", "torn", "gray-strip", "soft-card", "underline"];
const FONT_CLASSES = ["font-cute", "font-hand", "font-brush", "font-caoshu", "font-luoyan", "font-serif", "font-clean"];
const HANDLE_DIRS = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];
const EXPORT_SCALE = 2;

/* ── State ── */
let selectedItems = new Set();
let activePage = null;
let zCounter = 20;
let activePalette = "cream";
let activeStyle = "cream";
let suppressClickSelection = null;

let undoStack = [];
let redoStack = [];
let suppressHistory = false;
const MAX_HISTORY = 50;

let resizeHandles = [];
let resizingItem = null;
const dragOriginalPositions = new Map();

/* ── Undo / Redo ── */
function captureState() {
  return {
    pagesHtml: pages.innerHTML,
    activePalette,
    activeStyle,
    fontPresetValue: fontPreset.value,
    sourceTextValue: sourceText.value,
  };
}

function saveHistory() {
  if (suppressHistory) return;
  undoStack.push(captureState());
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  autoSaveToLocal();
  updateUndoRedoButtons();
}

function restoreState(state) {
  suppressHistory = true;
  sourceText.value = state.sourceTextValue || "";
  activePalette = state.activePalette || "cream";
  activeStyle = state.activeStyle || "cream";
  stylePreset.value = state.activeStyle || stylePreset.value;
  fontPreset.value = state.fontPresetValue || fontPreset.value;
  pages.innerHTML = state.pagesHtml || "";
  restoreInteractiveItems();
  document.querySelectorAll(".poster").forEach((page) => {
    applyPosterTheme(page);
    applyFontPreset(page);
  });
  setActivePage(pages.querySelector(".poster") || createPage());
  clearSelection();
  renderPalettes();
  suppressHistory = false;
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  redoStack.push(captureState());
  restoreState(undoStack.pop());
  statusText.textContent = "已撤销";
}

function redo() {
  if (redoStack.length === 0) return;
  undoStack.push(captureState());
  restoreState(redoStack.pop());
  statusText.textContent = "已重做";
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function autoSaveToLocal() {
  try {
    localStorage.setItem("xhs-draft-autosave", JSON.stringify(captureState()));
  } catch {}
}

function loadAutoSave() {
  try {
    const saved = localStorage.getItem("xhs-draft-autosave");
    if (saved) {
      const state = JSON.parse(saved);
      if (state.pagesHtml && state.pagesHtml.includes("poster")) return state;
    }
  } catch {}
  return null;
}

/* ── Palettes ── */
const palettes = {
  cream: {
    name: "温柔奶油", font: "cute", paper: "#fbf6ec", ink: "#3a3028",
    muted: "#8b7b6c", titleBg: "#e9dcc8", noteBg: "#f4e9da",
    highlightBg: "#efe1c5", accent: "#b99b7b",
  },
  xhsCard: {
    name: "小红书卡片", font: "clean", paper: "#fffdfb", ink: "#171717",
    muted: "#6d6963", titleBg: "#f4d7df", noteBg: "#ffe8ee",
    highlightBg: "#fff0c8", accent: "#e84b73",
  },
  japanMag: {
    name: "日系杂志", font: "serif", paper: "#f8f4ea", ink: "#24211d",
    muted: "#83786a", titleBg: "#ddd4c3", noteBg: "#eee4d2",
    highlightBg: "#d9e2d2", accent: "#9a7f63",
  },
  morandi: {
    name: "莫兰迪", font: "hand", paper: "#fbfaf6", ink: "#2b2d2f",
    muted: "#7d817b", titleBg: "#d8ddd3", noteBg: "#eadbd6",
    highlightBg: "#e9dfb7", accent: "#9c6f64",
  },
  bauhaus: {
    name: "包豪斯", font: "clean", paper: "#fffaf0", ink: "#111111",
    muted: "#55524b", titleBg: "#f2d04f", noteBg: "#f5d7d7",
    highlightBg: "#b9d7ea", accent: "#d64032",
  },
};

/* ── Text parsing ── */
function parseInput(text) {
  const rawLines = text.split("\n");
  const trimmed = rawLines.map((l) => l.trim());
  let firstContent = 0;
  while (firstContent < trimmed.length && !trimmed[firstContent]) firstContent++;
  const lines = trimmed.slice(firstContent);

  if (!lines.length) return { top: "", title: "小红书 Plog", blocks: [] };

  // Check for 【标题】 explicit marker
  const ti = lines.findIndex((l) => /^【标题】/.test(l));
  if (ti >= 0) {
    const title = lines[ti].replace(/^【标题】\s*/, "").trim() || "标题";
    const rest = lines.filter((_, i) => i !== ti);
    return { top: "", title, blocks: normalizeBlocks(rest) };
  }

  // If line[0] has "|" and line[1] exists: tagline + title format (e.g. "期末周 | 大考 | 能量恢复")
  if (lines.length > 1 && /\|/.test(lines[0]) && lines[0].length < 40) {
    return { top: lines[0], title: lines[1], blocks: normalizeBlocks(lines.slice(2)) };
  }

  // Default: first line is title, no header
  return { top: "", title: lines[0], blocks: normalizeBlocks(lines.slice(1)) };
}

function normalizeBlocks(lines) {
  // Split into paragraph groups: blank lines ("") are separators
  const groups = [];
  let current = [];
  for (const l of lines) {
    if (l === "") {
      if (current.length) { groups.push(current); current = []; }
    } else {
      current.push(l);
    }
  }
  if (current.length) groups.push(current);

  const blocks = [];
  groups.forEach((group) => {
    let heading = "";
    let bodyLines = [];
    const first = group[0];
    // Short first line without sentence-ending punctuation → likely a section label
    const looksLikeLabel = first.length <= 12 && !/[。！？；…]$/.test(first) && group.length > 1;
    if (isSectionHeading(first) || looksLikeLabel) {
      heading = first;
      bodyLines = group.slice(1);
    } else {
      bodyLines = group;
    }
    const body = bodyLines.join("\n");
    blocks.push({ heading, body });
  });

  if (!blocks.length) return [];
  return blocks;
}

function isSectionHeading(line) {
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}]?[️]?\s*[一-龥A-Za-z0-9]+[：:]/u.test(line);
}

/* ── Page management ── */
function createPage() {
  const page = document.createElement("article");
  page.className = `poster font-${fontPreset.value}`;
  page.setAttribute("aria-label", `海报第 ${pages.children.length + 1} 页`);
  page.addEventListener("click", () => { setActivePage(page); clearSelection(); });
  pages.append(page);
  applyPosterTheme(page);
  setActivePage(page);
  return page;
}

function setActivePage(page) {
  if (!page) return;
  activePage = page;
  document.querySelectorAll(".poster").forEach((p) => p.classList.toggle("active-page", p === activePage));
  updatePageStatus();
}

function currentPage() {
  if (!activePage || !pages.contains(activePage)) return pages.querySelector(".poster") || createPage();
  return activePage;
}

/* ── Element creation ── */
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
  const { x = 40, y = 40, w = 220, h, size = 28, color = currentPalette().ink,
    bg, alpha = 100, z, font = "", bold = false } = options;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  if (h) el.style.height = `${h}px`;
  el.style.fontSize = `${size}px`;
  el.style.color = color;
  if (bold) el.style.fontWeight = "700";
  if (font) setElementFont(el, font);
  if (bg) setElementBg(el, bg, alpha);
  el.style.zIndex = String(z || zCounter++);
}

/* ── Collision avoidance with position restoration ── */
function getElementRect(el) {
  const left = parseFloat(el.style.left) || 0;
  const top = parseFloat(el.style.top) || 0;
  const width = parseFloat(el.style.width) || el.offsetWidth || 100;
  const height = el.style.height ? parseFloat(el.style.height) : (el.offsetHeight || 50);
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function rectsOverlap(a, b) {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

function pushAway(movedRect, item) {
  const ir = getElementRect(item);
  const ox = Math.min(movedRect.right, ir.right) - Math.max(movedRect.left, ir.left);
  const oy = Math.min(movedRect.bottom, ir.bottom) - Math.max(movedRect.top, ir.top);
  if (ox <= 0 || oy <= 0) return;
  const pad = 8;
  if (ox < oy) {
    const d = (ir.left + ir.width / 2) > (movedRect.left + movedRect.width / 2) ? 1 : -1;
    item.style.left = `${Math.max(-10, Math.min(PAGE_W - 30, ir.left + d * (ox + pad)))}px`;
  } else {
    const d = (ir.top + ir.height / 2) > (movedRect.top + movedRect.height / 2) ? 1 : -1;
    item.style.top = `${Math.max(-10, Math.min(PAGE_H - 30, ir.top + d * (oy + pad)))}px`;
  }
}

function saveDragOriginalPositions(page) {
  if (!page) return;
  page.querySelectorAll(".item:not(.page-number)").forEach((item) => {
    if (!selectedItems.has(item) && !dragOriginalPositions.has(item)) {
      dragOriginalPositions.set(item, { left: item.style.left, top: item.style.top });
    }
  });
}

function resolveOverlaps(movedEl) {
  const page = movedEl.closest(".poster");
  if (!page) return;
  const mr = getElementRect(movedEl);
  const items = [...page.querySelectorAll(".item")].filter(
    (el) => el !== movedEl && !el.classList.contains("page-number") && !selectedItems.has(el)
  );
  items.forEach((item) => {
    if (rectsOverlap(mr, getElementRect(item))) {
      pushAway(mr, item);
    } else if (dragOriginalPositions.has(item)) {
      const orig = dragOriginalPositions.get(item);
      item.style.left = orig.left;
      item.style.top = orig.top;
    }
  });
}

/* ── Resize handles ── */
function showResizeHandles(item) {
  removeResizeHandles();
  if (!item) return;
  const page = item.closest(".poster");
  if (!page) return;
  HANDLE_DIRS.forEach((dir) => {
    const h = document.createElement("div");
    h.className = `resize-handle rh-${dir}`;
    h.dataset.dir = dir;
    h.addEventListener("pointerdown", onResizeStart);
    page.append(h);
    resizeHandles.push(h);
  });
  resizingItem = item;
  positionResizeHandles();
}

function positionResizeHandles() {
  if (!resizingItem || !resizeHandles.length) return;
  const item = resizingItem;
  const x = parseFloat(item.style.left) || 0;
  const y = parseFloat(item.style.top) || 0;
  const w = parseFloat(item.style.width) || item.offsetWidth;
  const h = item.style.height ? parseFloat(item.style.height) : item.offsetHeight;
  const pos = {
    nw: [x, y], n: [x + w / 2, y], ne: [x + w, y],
    w: [x, y + h / 2], e: [x + w, y + h / 2],
    sw: [x, y + h], s: [x + w / 2, y + h], se: [x + w, y + h],
  };
  resizeHandles.forEach((h) => {
    const [hx, hy] = pos[h.dataset.dir];
    h.style.left = `${hx - 5}px`;
    h.style.top = `${hy - 5}px`;
  });
}

function removeResizeHandles() {
  resizeHandles.forEach((h) => h.remove());
  resizeHandles = [];
  resizingItem = null;
}

function updateResizeHandles() {
  if (selectedItems.size === 1) showResizeHandles(primarySelection());
  else removeResizeHandles();
}

function onResizeStart(event) {
  event.stopPropagation();
  event.preventDefault();
  const dir = event.currentTarget.dataset.dir;
  const item = resizingItem;
  if (!item) return;
  saveHistory();

  const page = item.closest(".poster");
  const pr = page.getBoundingClientRect();
  const scale = pr.width / PAGE_W;
  const startX = event.clientX, startY = event.clientY;
  const sL = parseFloat(item.style.left) || 0;
  const sT = parseFloat(item.style.top) || 0;
  const sW = parseFloat(item.style.width) || item.offsetWidth;
  const sH = item.style.height ? parseFloat(item.style.height) : item.offsetHeight;
  const isImg = item.classList.contains("image-item");
  const ratio = isImg && sH > 0 ? sW / sH : 0;

  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  function move(e) {
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    let nL = sL, nT = sT, nW = sW, nH = sH;

    if (dir.includes("e")) nW = Math.max(40, sW + dx);
    if (dir.includes("w")) { nW = Math.max(40, sW - dx); nL = sL + sW - nW; }
    if (dir.includes("s")) nH = Math.max(20, sH + dy);
    if (dir.includes("n")) { nH = Math.max(20, sH - dy); nT = sT + sH - nH; }

    if (isImg && ratio > 0) {
      if (dir === "e" || dir === "w") { nH = nW / ratio; }
      else if (dir === "n" || dir === "s") { nW = nH * ratio; if (dir.includes("w")) nL = sL + sW - nW; }
      else { nH = nW / ratio; }
    }

    item.style.left = `${nL}px`;
    item.style.top = `${nT}px`;
    item.style.width = `${nW}px`;
    if (isImg) {
      item.style.height = `${nH}px`;
    } else {
      item.style.height = "";
    }
    positionResizeHandles();
  }
  function stop() {
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", stop);
    target.removeEventListener("pointercancel", stop);
    autoSaveToLocal();
  }
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", stop);
  target.addEventListener("pointercancel", stop);
}

/* ── Interactive / Drag ── */
function makeInteractive(el) {
  el.addEventListener("pointerdown", startDrag);
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    if (suppressClickSelection === el) { suppressClickSelection = null; return; }
    select(el, { add: event.ctrlKey || event.metaKey });
  });
}

function findPageAtPoint(clientY) {
  const all = [...pages.querySelectorAll(".poster")];
  for (const p of all) {
    const r = p.getBoundingClientRect();
    if (clientY >= r.top - 10 && clientY <= r.bottom + 10) return p;
  }
  let best = null, min = Infinity;
  for (const p of all) {
    const r = p.getBoundingClientRect();
    const d = Math.abs(clientY - (r.top + r.bottom) / 2);
    if (d < min) { min = d; best = p; }
  }
  return best;
}

function startDrag(event) {
  const el = event.currentTarget;
  const page = el.closest(".poster");
  setActivePage(page);
  if (!selectedItems.has(el)) {
    select(el, { add: event.ctrlKey || event.metaKey });
    suppressClickSelection = el;
  }

  const dragged = [...selectedItems];
  removeResizeHandles();

  const posterRect = page.getBoundingClientRect();
  const scale = posterRect.width / PAGE_W;

  const itemData = dragged.map((item) => {
    const ip = item.closest(".poster");
    const ir = ip.getBoundingClientRect();
    const is = ir.width / PAGE_W;
    return {
      item,
      mox: (event.clientX - ir.left) / is - (parseFloat(item.style.left) || 0),
      moy: (event.clientY - ir.top) / is - (parseFloat(item.style.top) || 0),
    };
  });

  const touchedPages = new Set(dragged.map((d) => d.closest(".poster")).filter(Boolean));
  dragOriginalPositions.clear();
  touchedPages.forEach((p) => saveDragOriginalPositions(p));

  const scroller = document.querySelector(".stage-scroll");
  const scrollRect = scroller.getBoundingClientRect();
  const autoScrollZone = 60;

  let historySaved = false;
  let autoScrollRaf = null;
  el.setPointerCapture(event.pointerId);

  function autoScroll(me) {
    const relY = me.clientY - scrollRect.top;
    const scrollSpeed = 12;
    if (relY < autoScrollZone && scroller.scrollTop > 0) {
      scroller.scrollTop -= scrollSpeed;
    } else if (relY > scrollRect.height - autoScrollZone && scroller.scrollTop < scroller.scrollHeight - scrollRect.height) {
      scroller.scrollTop += scrollSpeed;
    }
    autoScrollRaf = null;
  }

  function move(me) {
    if (!historySaved) { saveHistory(); historySaved = true; }

    if (!autoScrollRaf) autoScrollRaf = requestAnimationFrame(() => autoScroll(me));

    const tp = findPageAtPoint(me.clientY);
    if (!tp) return;
    const tr = tp.getBoundingClientRect();
    const ts = tr.width / PAGE_W;
    const mlx = (me.clientX - tr.left) / ts;
    const mly = (me.clientY - tr.top) / ts;

    itemData.forEach(({ item, mox, moy }) => {
      const nL = mlx - mox;
      const nT = mly - moy;
      if (item.parentElement !== tp) {
        tp.append(item);
        saveDragOriginalPositions(tp);
      }
      item.style.left = `${Math.max(-20, Math.min(PAGE_W - 20, nL))}px`;
      item.style.top = `${Math.max(-20, Math.min(PAGE_H - 20, nT))}px`;
      if (item.classList.contains("image-item")) resolveOverlaps(item);
    });
    setActivePage(tp);
  }

  function stop() {
    if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = null; }
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", stop);
    el.removeEventListener("pointercancel", stop);
    dragOriginalPositions.clear();
    updateResizeHandles();
    autoSaveToLocal();
  }
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", stop);
  el.addEventListener("pointercancel", stop);
}

/* ── Selection ── */
function select(el, { add = false } = {}) {
  if (!add) { removeResizeHandles(); clearSelection(false); }
  if (add && selectedItems.has(el)) {
    el.classList.remove("selected");
    selectedItems.delete(el);
  } else {
    el.classList.add("selected");
    selectedItems.add(el);
  }
  setActivePage(el.closest(".poster"));
  syncControls();
  updateResizeHandles();
}

function clearSelection(update = true) {
  removeResizeHandles();
  selectedItems.forEach((item) => item.classList.remove("selected"));
  selectedItems.clear();
  if (update) syncControls();
}

function syncControls() {
  const sel = primarySelection();
  const count = selectedItems.size;
  statusText.textContent = count ? `已选中 ${count} 个元素，可拖拽或批量调整` : "选择元素后可在右侧调整";
  const has = Boolean(sel);
  controls.forEach((c) => (c.disabled = !has));
  if (boldToggle) boldToggle.disabled = !has;
  document.querySelector("#bringForward").disabled = !has;
  document.querySelector("#deleteBtn").disabled = !has;
  if (!sel) { editText.value = ""; if (boldToggle) boldToggle.checked = false; return; }
  const isText = sel.classList.contains("text-item");
  editText.disabled = !isText || count > 1;
  shapeSelect.disabled = !isText;
  elementFont.disabled = !isText;
  editText.value = isText && count === 1 ? sel.textContent : "";
  fontSize.value = Math.min(parseInt(sel.style.fontSize, 10) || 28, Number(fontSize.max));
  boxWidth.value = Math.min(parseInt(sel.style.width, 10) || 220, Number(boxWidth.max));
  textColor.value = rgbToHex(sel.style.color) || currentPalette().ink;
  bgColor.value = sel.dataset.bgHex || "#ffffff";
  bgAlpha.value = sel.dataset.bgAlpha || "0";
  shapeSelect.value = getElementShape(sel);
  elementFont.value = sel.dataset.fontPreset || "";
  if (boldToggle) boldToggle.checked = sel.style.fontWeight === "700" || sel.style.fontWeight === "bold";
}

function primarySelection() { return [...selectedItems][selectedItems.size - 1] || null; }
function selectedTextItems() { return [...selectedItems].filter((i) => i.classList.contains("text-item")); }

/* ── Build poster ── */
function buildPoster() {
  saveHistory();
  const { top, title, blocks } = parseInput(sourceText.value);
  const palette = currentPalette();
  pages.innerHTML = "";
  clearSelection(false);
  zCounter = 20;

  if (!title && !blocks.length) {
    createPage();
    syncControls();
    statusText.textContent = "请输入文字后点击生成";
    autoSaveToLocal();
    return;
  }

  let page = createPage();
  let y = 28;
  const margin = 28, gap = 14, cw = 484;

  if (top) {
    const topEl = createText(top, "subtitle plain-block", { page, x: margin, y, w: cw, size: 21, color: palette.muted, z: 130 });
    y += renderedHeight(topEl) + 8;
  }
  if (title) {
    const titleEl = createText(title, "brush title-block gray-strip", { page, x: 16, y, w: 508, size: fitTitleSize(title), bg: palette.titleBg, alpha: 88, z: 200 });
    y += renderedHeight(titleEl) + 22;
  }

  makeFlowBlocks(blocks).forEach((block) => {
    splitTextToFit(block, page, PAGE_BOTTOM - 52).forEach((chunk) => {
      const m = measureText(chunk.text, block.shape, { page, w: block.width || cw, size: block.size });
      if (y + m > PAGE_BOTTOM) {
        addPageNumber(page);
        page = createPage();
        y = 34;
        const ct = createText(`${title} / 续页`, "subtitle plain-block", { page, x: margin, y, w: cw, size: 18, color: palette.muted });
        y += renderedHeight(ct) + 14;
      }
      const el = createText(chunk.text, block.shape, { page, x: block.x || margin, y, w: block.width || cw, size: block.size, bg: bgForShape(block.shape), alpha: alphaForShape(block.shape) });
      y += renderedHeight(el) + gap;
    });
  });

  addPageNumber(page);
  setActivePage(pages.querySelector(".poster"));
  syncControls();
  statusText.textContent = `已生成 ${pages.children.length} 页`;
  autoSaveToLocal();
}

function makeFlowBlocks(blocks) {
  return blocks.flatMap((b, i) => {
    const r = [];
    if (b.heading) r.push({ text: b.heading, shape: "gray-strip", size: 24 });
    if (b.body) r.push({ text: b.body, shape: "soft-card", size: 20 });
    return r;
  });
}

function splitTextToFit(block, page, maxH) {
  if (measureText(block.text, block.shape, { page, w: block.width || 484, size: block.size }) <= maxH)
    return [{ text: block.text }];
  const chunks = [];
  let cur = "";
  tokenizeText(block.text).forEach((tok) => {
    const next = cur ? cur + tok : tok.trimStart();
    if (cur && measureText(next, block.shape, { page, w: block.width || 484, size: block.size }) > maxH) {
      chunks.push({ text: cur.trim() });
      cur = tok.trimStart();
    } else cur = next;
  });
  if (cur.trim()) chunks.push({ text: cur.trim() });
  return chunks.length ? chunks : [{ text: block.text }];
}

function tokenizeText(text) {
  const r = text.split("\n").flatMap((l) => {
    const p = l.match(/[^。！？!?；;，,]+[。！？!?；;，,]?/g) || [l];
    return p.map((s, i) => (i === p.length - 1 ? s + "\n" : s));
  });
  return r.length ? r : [text];
}

function measureText(text, shape, { page, w, size }) {
  const p = createText(text, shape, { page, x: -2000, y: -2000, w, size, bg: bgForShape(shape), alpha: alphaForShape(shape) });
  const h = renderedHeight(p);
  p.remove();
  return h;
}

function renderedHeight(el) { return Math.ceil(Math.max(el.scrollHeight, el.getBoundingClientRect().height)); }

function fitTitleSize(t) { return t.length <= 9 ? 56 : t.length <= 16 ? 46 : t.length <= 24 ? 38 : 32; }

function addPageNumber(page) {
  if (page.querySelector(".page-number")) return;
  const n = document.createElement("div");
  n.className = "item text-item page-number plain-block";
  n.textContent = `${[...pages.children].indexOf(page) + 1}`;
  n.style.cssText = "left:496px;top:680px;width:22px;font-size:16px;z-index:12";
  n.style.color = currentPalette().muted;
  makeInteractive(n);
  page.append(n);
}

/* ── Image upload ── */
function addUploadedImages(files) {
  saveHistory();
  [...files].forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = () => {
      const el = createImage(reader.result, "photo", {
        x: 42 + (i % 3) * 170, y: 72 + Math.floor(i / 3) * 140, w: 160, h: 120,
      });
      resolveOverlaps(el);
      autoSaveToLocal();
    };
    reader.readAsDataURL(file);
  });
}

/* ── Canvas-based export ── */
async function exportPng() {
  clearSelection();
  const posters = [...document.querySelectorAll(".poster")];
  for (const [i, poster] of posters.entries()) await canvasExportOne(poster, i + 1);
  statusText.textContent = `已导出 ${posters.length} 张高清 PNG`;
}

async function canvasExportOne(poster, pageNo) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W * EXPORT_SCALE;
  canvas.height = PAGE_H * EXPORT_SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

  ctx.fillStyle = poster.style.backgroundColor || "#fffdf8";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  const items = [...poster.querySelectorAll(".item")].sort(
    (a, b) => (parseInt(a.style.zIndex) || 0) - (parseInt(b.style.zIndex) || 0)
  );

  const imgMap = new Map();
  await Promise.all(
    items
      .filter((el) => el.classList.contains("image-item"))
      .map((el) => {
        const img = el.querySelector("img");
        if (!img) return Promise.resolve();
        return new Promise((res) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => { imgMap.set(el, i); res(); };
          i.onerror = res;
          i.src = img.src;
        });
      })
  );

  for (const item of items) {
    const x = parseFloat(item.style.left) || 0;
    const y = parseFloat(item.style.top) || 0;
    const w = parseFloat(item.style.width) || item.offsetWidth || 100;
    const h = item.style.height ? parseFloat(item.style.height) : item.offsetHeight || 50;

    ctx.save();

    if (item.classList.contains("image-item")) {
      const img = imgMap.get(item);
      if (img) {
        if (item.classList.contains("sticker")) {
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 4, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, x, y, w, h);
          ctx.restore();
          ctx.save();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
      }
    } else if (item.classList.contains("text-item")) {
      drawCanvasShape(ctx, item, x, y, w, h);

      const fs = parseFloat(item.style.fontSize) || 28;
      const isBold = item.style.fontWeight === "700" || item.style.fontWeight === "bold";
      const ff = getComputedStyle(item).fontFamily;
      ctx.font = `${isBold ? "bold " : ""}${fs}px ${ff}`;
      ctx.fillStyle = item.style.color || "#000";
      ctx.textBaseline = "top";

      const shape = getElementShape(item);
      const px = shapePadX(shape), py = shapePadY(shape);
      const lines = wrapCanvasText(ctx, item.textContent, w - px * 2);
      const lh = fs * 1.48;
      lines.forEach((line, i) => ctx.fillText(line, x + px, y + py + i * lh));
    }

    ctx.restore();
  }

  const link = document.createElement("a");
  link.download = `xhs-collage-p${String(pageNo).padStart(2, "0")}-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawCanvasShape(ctx, item, x, y, w, h) {
  const bg = item.style.backgroundColor;
  if (!bg || bg === "transparent" || bg === "rgba(0, 0, 0, 0)") return;
  const shape = getElementShape(item);
  ctx.fillStyle = bg;
  switch (shape) {
    case "note":
    case "gray-strip":
      ctx.fillRect(x, y, w, h);
      break;
    case "highlight":
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#f2c300";
      ctx.fillRect(x, y, 2, h);
      ctx.fillRect(x + w - 2, y, 2, h);
      break;
    case "soft-card":
      ctx.shadowColor = "rgba(0,0,0,0.08)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      canvasRoundRect(ctx, x, y, w, h, 8);
      ctx.fill();
      ctx.shadowColor = "transparent";
      break;
    case "torn":
      ctx.shadowColor = "rgba(0,0,0,0.16)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 4;
      canvasTornRect(ctx, x, y, w, h);
      ctx.fill();
      ctx.shadowColor = "transparent";
      break;
    case "underline":
      ctx.fillStyle = "rgba(233,95,139,0.35)";
      ctx.fillRect(x, y + h - 5, w, 5);
      break;
  }
}

function canvasRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function canvasTornRect(ctx, x, y, w, h) {
  const pts = [
    [0,6],[4,2],[9,4],[15,1],[21,5],[28,2],[34,5],[42,1],[49,4],[56,2],
    [65,5],[72,1],[80,4],[88,2],[96,5],[100,9],[97,20],[100,31],[96,43],
    [99,56],[96,70],[100,84],[94,96],[83,98],[71,95],[58,99],[45,96],
    [33,99],[20,96],[9,99],[1,94],[3,78],[0,63],[3,48],[0,32],[4,18],
  ];
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const cx = x + (px / 100) * w, cy = y + (py / 100) * h;
    i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy);
  });
  ctx.closePath();
}

function shapePadX(s) {
  if (s === "note") return 14;
  if (s === "highlight") return 9;
  if (s === "torn") return 22;
  if (s === "gray-strip") return 12;
  if (s === "soft-card") return 16;
  if (s === "underline") return 2;
  return 4;
}

function shapePadY(s) {
  if (s === "note") return 10;
  if (s === "torn") return 18;
  if (s === "soft-card") return 14;
  if (s === "gray-strip") return 5;
  if (s === "highlight") return 3;
  return 2;
}

function wrapCanvasText(ctx, text, maxW) {
  const paras = text.split("\n");
  const lines = [];
  for (const p of paras) {
    if (!p.length) { lines.push(""); continue; }
    let line = "";
    for (const ch of p) {
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line.length > 0) { lines.push(line); line = ch; }
      else line = t;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/* ── Draft save/load ── */
function saveDraft() {
  const draft = { version: 4, sourceText: sourceText.value, activePalette, activeStyle, fontPreset: fontPreset.value, pagesHtml: pages.innerHTML };
  downloadTextFile(`xhs-draft-${Date.now()}.json`, JSON.stringify(draft, null, 2));
  statusText.textContent = "草稿已下载";
}

function loadDraftFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      saveHistory();
      sourceText.value = d.sourceText || sourceText.value;
      activePalette = d.activePalette || "cream";
      activeStyle = d.activeStyle || d.stylePreset || activePalette;
      stylePreset.value = activeStyle;
      fontPreset.value = d.fontPreset || palettes[activeStyle]?.font || fontPreset.value;
      pages.innerHTML = d.pagesHtml || "";
      restoreInteractiveItems();
      renderPalettes();
      document.querySelectorAll(".poster").forEach((p) => { applyPosterTheme(p); applyFontPreset(p); });
      setActivePage(pages.querySelector(".poster") || createPage());
      clearSelection();
      statusText.textContent = "草稿已载入";
      autoSaveToLocal();
    } catch { statusText.textContent = "草稿格式不正确"; }
  };
  reader.readAsText(file);
}

function downloadTextFile(name, text) {
  const b = new Blob([text], { type: "application/json" });
  const a = document.createElement("a");
  a.download = name;
  a.href = URL.createObjectURL(b);
  a.click();
  URL.revokeObjectURL(a.href);
}

function restoreInteractiveItems() {
  pages.querySelectorAll(".item").forEach((el) => makeInteractive(el));
  pages.querySelectorAll(".poster").forEach((p) => {
    p.addEventListener("click", () => { setActivePage(p); clearSelection(); });
  });
}

/* ── Palettes & themes ── */
function renderPalettes() {
  paletteList.innerHTML = "";
  Object.entries(palettes).forEach(([key, pal]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `palette-button ${key === activePalette ? "active" : ""}`;
    btn.innerHTML = `<span>${pal.name}</span><span class="swatches">${[pal.ink, pal.titleBg, pal.noteBg, pal.highlightBg, pal.accent].map((c) => `<span class="swatch" style="background:${c}"></span>`).join("")}</span>`;
    btn.addEventListener("click", () => applyPalettePreset(key));
    paletteList.append(btn);
  });
}

function applyStylePreset(key) {
  saveHistory();
  activeStyle = key; activePalette = key;
  stylePreset.value = key;
  fontPreset.value = currentPalette().font;
  renderPalettes();
  document.querySelectorAll(".poster").forEach((p) => { applyPosterTheme(p); applyFontPreset(p); });
  applyPaletteToPoster();
}

function applyPalettePreset(key) {
  saveHistory();
  activePalette = key;
  renderPalettes();
  document.querySelectorAll(".poster").forEach((p) => applyPosterTheme(p));
  applyPaletteToPoster();
}

function applyPaletteToPoster() {
  const pal = currentPalette();
  document.querySelectorAll(".text-item").forEach((el) => {
    if (el.classList.contains("page-number")) el.style.color = pal.muted;
    else el.style.color = pal.ink;
    if (el.classList.contains("title-block") || el.classList.contains("gray-strip")) setElementBg(el, pal.titleBg, 88);
    if (el.classList.contains("note") || el.classList.contains("soft-card")) setElementBg(el, pal.noteBg, 70);
    if (el.classList.contains("highlight")) setElementBg(el, pal.highlightBg, 76);
  });
  syncControls();
  autoSaveToLocal();
}

function applyPosterTheme(page) { page.style.backgroundColor = currentPalette().paper; }

function applyFontPreset(page = null) {
  (page ? [page] : [...document.querySelectorAll(".poster")]).forEach((p) => {
    p.classList.remove(...FONT_CLASSES);
    p.classList.add(`font-${fontPreset.value}`);
  });
}

function currentPalette() { return palettes[activePalette]; }

function bgForShape(s) {
  const p = currentPalette();
  if (s === "highlight") return p.highlightBg;
  if (s === "note" || s === "soft-card") return p.noteBg;
  if (s === "gray-strip") return p.titleBg;
  return "#ffffff";
}

function alphaForShape(s) {
  if (s === "plain-block" || s === "underline") return 0;
  if (s === "torn") return 100;
  if (s === "gray-strip") return 88;
  return 72;
}

function setElementBg(el, bg, alpha) {
  el.dataset.bgHex = bg;
  el.dataset.bgAlpha = String(alpha);
  el.style.backgroundColor = hexToRgba(bg, alpha / 100);
}

function setElementShape(el, shape) {
  SHAPES.forEach((s) => el.classList.remove(s));
  el.classList.add(shape);
  setElementBg(el, bgForShape(shape), alphaForShape(shape));
}

function getElementShape(el) { return SHAPES.find((s) => el.classList.contains(s)) || "plain-block"; }

function setElementFont(el, font) {
  FONT_CLASSES.forEach((f) => el.classList.remove(f));
  el.dataset.fontPreset = font;
  if (font) el.classList.add(`font-${font}`);
}

function duplicateSelection() {
  saveHistory();
  const clones = [...selectedItems].map((item) => {
    const c = item.cloneNode(true);
    c.classList.remove("selected");
    c.style.left = `${(parseFloat(item.style.left) || 0) + 18}px`;
    c.style.top = `${(parseFloat(item.style.top) || 0) + 18}px`;
    c.style.zIndex = String(zCounter++);
    makeInteractive(c);
    item.closest(".poster").append(c);
    return c;
  });
  clearSelection(false);
  clones.forEach((c) => { c.classList.add("selected"); selectedItems.add(c); });
  syncControls();
  updateResizeHandles();
  autoSaveToLocal();
}

function updatePageStatus() {
  const ps = [...document.querySelectorAll(".poster")];
  pageStatus.textContent = `第 ${ps.indexOf(activePage) + 1 || 1} / ${ps.length || 1} 页`;
}

/* ── Utilities ── */
function hexToRgba(hex, a) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function rgbToHex(v) {
  if (!v) return currentPalette().ink;
  if (v.startsWith("#")) return v;
  const m = v.match(/\d+/g);
  return m ? `#${m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : currentPalette().ink;
}

/* ── Event listeners ── */
document.querySelector("#generateBtn").addEventListener("click", buildPoster);
document.querySelector("#clearBtn").addEventListener("click", () => {
  saveHistory(); pages.innerHTML = ""; createPage(); clearSelection(); autoSaveToLocal();
});
document.querySelector("#addPageBtn").addEventListener("click", () => {
  saveHistory(); createPage(); statusText.textContent = "已添加空白页"; autoSaveToLocal();
});
document.querySelector("#imageInput").addEventListener("change", (e) => addUploadedImages(e.target.files));
document.querySelector("#addTextBtn").addEventListener("click", () => {
  saveHistory();
  createText("在右侧修改文字", "note", { x: 80, y: 90, w: 260, size: 24, bg: currentPalette().noteBg, alpha: 70 });
  autoSaveToLocal();
});
document.querySelector("#addNoteBtn").addEventListener("click", () => {
  saveHistory();
  createText("新的便签\n可以拖到任意位置", "torn", { x: 145, y: 160, w: 245, size: 23, bg: "#ffffff", alpha: 100 });
  autoSaveToLocal();
});
document.querySelector("#exportBtn").addEventListener("click", exportPng);
document.querySelector("#saveDraftBtn").addEventListener("click", saveDraft);
document.querySelector("#loadDraftBtn").addEventListener("click", () => draftInput.click());
draftInput.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) loadDraftFile(f); draftInput.value = ""; });
document.querySelector("#bringForward").addEventListener("click", () => {
  saveHistory();
  selectedItems.forEach((item) => { item.style.zIndex = String(item.classList.contains("title-block") ? 200 : Math.min(zCounter++, 190)); });
  autoSaveToLocal();
});
document.querySelector("#deleteBtn").addEventListener("click", () => {
  saveHistory(); selectedItems.forEach((i) => i.remove()); clearSelection(); autoSaveToLocal();
});

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

function bindInputHistory(el, apply) {
  el.addEventListener("input", () => {
    if (!el.dataset.h) { saveHistory(); el.dataset.h = "1"; }
    apply();
  });
  el.addEventListener("change", () => { delete el.dataset.h; autoSaveToLocal(); });
}

bindInputHistory(editText, () => {
  const s = primarySelection();
  if (s && selectedItems.size === 1) { s.textContent = editText.value; s.style.height = ""; updateResizeHandles(); }
});
bindInputHistory(fontSize, () => selectedItems.forEach((i) => (i.style.fontSize = `${fontSize.value}px`)));
bindInputHistory(boxWidth, () => selectedItems.forEach((i) => { i.style.width = `${boxWidth.value}px`; if (!i.classList.contains("image-item")) i.style.height = ""; }));
bindInputHistory(textColor, () => selectedItems.forEach((i) => (i.style.color = textColor.value)));
bindInputHistory(bgColor, () => selectedItems.forEach((i) => setElementBg(i, bgColor.value, Number(bgAlpha.value))));
bindInputHistory(bgAlpha, () => selectedItems.forEach((i) => setElementBg(i, bgColor.value, Number(bgAlpha.value))));

shapeSelect.addEventListener("change", () => { saveHistory(); selectedTextItems().forEach((i) => setElementShape(i, shapeSelect.value)); autoSaveToLocal(); });
elementFont.addEventListener("change", () => { saveHistory(); selectedTextItems().forEach((i) => setElementFont(i, elementFont.value)); autoSaveToLocal(); });

if (boldToggle) {
  boldToggle.addEventListener("change", () => {
    saveHistory();
    selectedItems.forEach((i) => (i.style.fontWeight = boldToggle.checked ? "700" : ""));
    autoSaveToLocal();
  });
}

fontPreset.addEventListener("change", () => { saveHistory(); applyFontPreset(); autoSaveToLocal(); });
stylePreset.addEventListener("change", () => applyStylePreset(stylePreset.value));

document.addEventListener("keydown", (e) => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && selectedItems.size) { e.preventDefault(); duplicateSelection(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
});

/* ── Init ── */
renderPalettes();
applyStylePreset(stylePreset.value);
const autoSaved = loadAutoSave();
if (autoSaved) { restoreState(autoSaved); statusText.textContent = "已恢复自动保存的草稿"; }
else buildPoster();
updateUndoRedoButtons();
