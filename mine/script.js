(() => {
  const STORAGE_KEY = "body_snapshot_history_v1";
  const VIEWBOX_W = 200;
  const VIEWBOX_H = 400;
  const MARK_LOGICAL = 500;
  const PREVIEW_LOGICAL = 360;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const screens = {
    capture: $("#capture-screen"),
    saved: $("#saved-screen"),
    history: $("#history-screen"),
  };

  const stepViews = {
    1: $("#step-1"),
    2: $("#step-2"),
    3: $("#step-3"),
  };

  const actions = {
    1: $("#actions-1"),
    2: $("#actions-2"),
    3: $("#actions-3"),
  };

  const pills = $$(".pill");

  const bodySvg = $("#body-svg");
  const locDot = $("#loc-dot");
  const toStep2Btn = $("#to-step-2");
  const toStep3Btn = $("#to-step-3");
  const backTo1Btn = $("#back-to-1");
  const backTo2Btn = $("#back-to-2");
  const saveBtn = $("#save");
  const historyBtn = $("#history-btn");

  const markCanvas = $("#mark-canvas");
  const brushSize = $("#brush-size");
  const brushSizeValue = $("#brush-size-value");
  const undoBtn = $("#undo");
  const clearBtn = $("#clear");

  const classBtns = $$(".classBtn");
  const clockCanvas = $("#clock-canvas");
  const timeReadout = $("#time-readout");
  const clearTimeBtn = $("#clear-time");
  const noteInput = $("#note");
  const noteMeta = $("#note-meta");

  const newSnapshotBtn = $("#new-snapshot");
  const viewHistoryBtn = $("#view-history");

  const historyList = $("#history-list");
  const historyCloseBtn = $("#history-close");
  const historyNewBtn = $("#history-new");
  const historyClearAllBtn = $("#history-clear-all");

  const detailEmpty = $("#detail-empty");
  const detailContent = $("#detail-content");
  const detailMeta = $("#detail-meta");
  const detailTime = $("#detail-time");
  const detailNote = $("#detail-note");
  const detailBackBtn = $("#detail-back");
  const previewCanvas = $("#preview-canvas");

  let state = null;

  let bodyImage = null;
  let bodyImageReady = false;
  let selectedHistoryIndex = null;

  function encodeSvgForDataUrl(svgText) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  }

  function ensureBodyImage() {
    if (bodyImageReady && bodyImage) return Promise.resolve(bodyImage);
    return new Promise((resolve) => {
      const clone = bodySvg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      const dot = clone.querySelector("#loc-dot");
      if (dot) dot.remove();

      const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
      style.textContent =
        ".bodyFill{fill:#FBFCFC;}" +
        ".bodyStroke{fill:none;stroke:#CBD3D8;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;}";

      const defs = clone.querySelector("defs");
      if (defs) defs.appendChild(style);
      else clone.insertBefore(style, clone.firstChild);

      const svgText = new XMLSerializer().serializeToString(clone);
      const img = new Image();
      img.onload = () => {
        bodyImage = img;
        bodyImageReady = true;
        resolve(img);
      };
      img.onerror = () => {
        bodyImage = null;
        bodyImageReady = false;
        resolve(null);
      };
      img.src = encodeSvgForDataUrl(svgText);
    });
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function hourToLabel(hour) {
    if (hour == null) return "—";
    return `${pad2(hour)}:00`;
  }

  function formatWhen(iso) {
    const d = new Date(iso);
    const s = d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return s;
  }

  function iconForClass(c) {
    if (c === "good") return "🙂";
    if (c === "bad") return "☹";
    return "?";
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveHistory(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function newState() {
    return {
      step: 1,
      locate: {
        svgX: null,
        svgY: null,
        x: null,
        y: null,
      },
      brush: {
        r: 40,
      },
      strokes: [],
      classification: null,
      time: null,
      note: "",
    };
  }

  function showScreen(name) {
    Object.values(screens).forEach((el) => el.classList.add("hidden"));
    screens[name].classList.remove("hidden");
  }

  function showStep(step) {
    state.step = step;
    Object.values(stepViews).forEach((el) => el.classList.add("hidden"));
    Object.values(actions).forEach((el) => el.classList.add("hidden"));

    stepViews[step].classList.remove("hidden");
    actions[step].classList.remove("hidden");

    pills.forEach((p) => {
      const n = Number(p.dataset.pill);
      p.classList.toggle("active", n === step);
    });

    if (step === 1) {
      const ready = state.locate.svgX != null && state.locate.svgY != null;
      toStep2Btn.disabled = !ready;
    }

    if (step === 2) {
      toStep3Btn.disabled = false;
      redrawMark();
    }

    if (step === 3) {
      updateSaveEnabled();
      redrawClock();
    }
  }

  function setLocate(svgX, svgY) {
    state.locate.svgX = clamp(svgX, 0, VIEWBOX_W);
    state.locate.svgY = clamp(svgY, 0, VIEWBOX_H);
    state.locate.x = state.locate.svgX / VIEWBOX_W;
    state.locate.y = state.locate.svgY / VIEWBOX_H;

    locDot.setAttribute("cx", String(state.locate.svgX));
    locDot.setAttribute("cy", String(state.locate.svgY));
    locDot.classList.remove("hidden");
    toStep2Btn.disabled = false;
  }

  function svgPointFromEvent(evt, svgEl) {
    const rect = svgEl.getBoundingClientRect();
    const clientX = evt.clientX ?? (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
    const clientY = evt.clientY ?? (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);
    const x = ((clientX - rect.left) / rect.width) * VIEWBOX_W;
    const y = ((clientY - rect.top) / rect.height) * VIEWBOX_H;
    return { x, y };
  }

  function setupCanvas(canvas, logicalSize) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(logicalSize * dpr);
    canvas.height = Math.round(logicalSize * dpr);
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    return { ctx, dpr, logicalSize };
  }

  function canvasPointFromPointer(evt, canvas, logicalSize) {
    const rect = canvas.getBoundingClientRect();
    const clientX = evt.clientX ?? (evt.touches && evt.touches[0] ? evt.touches[0].clientX : 0);
    const clientY = evt.clientY ?? (evt.touches && evt.touches[0] ? evt.touches[0].clientY : 0);
    const x = ((clientX - rect.left) / rect.width) * logicalSize;
    const y = ((clientY - rect.top) / rect.height) * logicalSize;
    return { x: clamp(x, 0, logicalSize), y: clamp(y, 0, logicalSize) };
  }

  function roundedRectPath(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawZoomedBody(ctx, logicalSize, svgX, svgY) {
    const center = logicalSize / 2;
    const baseScale = Math.min(logicalSize / VIEWBOX_W, logicalSize / VIEWBOX_H);
    const zoom = 2.25;

    ctx.save();
    ctx.clearRect(0, 0, logicalSize, logicalSize);

    const bg = ctx.createLinearGradient(0, 0, 0, logicalSize);
    bg.addColorStop(0, "#FFFFFF");
    bg.addColorStop(1, "#FAFAF8");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, logicalSize, logicalSize);

    if (bodyImageReady && bodyImage) {
      const totalScale = baseScale * zoom;
      const tx = center - svgX * totalScale;
      const ty = center - svgY * totalScale;

      ctx.globalAlpha = 0.92;
      ctx.drawImage(bodyImage, tx, ty, VIEWBOX_W * totalScale, VIEWBOX_H * totalScale);
      ctx.globalAlpha = 1;

      const vignette = ctx.createRadialGradient(center, center, logicalSize * 0.05, center, center, logicalSize * 0.65);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.06)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, logicalSize, logicalSize);
    } else {
      ctx.strokeStyle = "rgba(120,130,135,0.18)";
      ctx.lineWidth = 2;
      roundedRectPath(ctx, 12, 12, logicalSize - 24, logicalSize - 24, 18);
      ctx.stroke();
    }

    ctx.restore();
  }

  function stampBrush(ctx, x, y, r) {
    const color = { r: 91, g: 122, b: 141 };
    const coreA = 0.20;
    const edgeA = 0.0;

    const jitter = Math.max(1, r * 0.08);
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const jx = x + (Math.random() - 0.5) * jitter * 2;
      const jy = y + (Math.random() - 0.5) * jitter * 2;
      const rr = r * (0.85 + Math.random() * 0.35);

      const g = ctx.createRadialGradient(jx, jy, 0, jx, jy, rr);
      g.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${coreA})`);
      g.addColorStop(1, `rgba(${color.r},${color.g},${color.b},${edgeA})`);

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(jx, jy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStroke(ctx, stroke, scale = 1) {
    const r = stroke.r * scale;
    const pts = stroke.points;
    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0] * scale;
      const y = pts[i][1] * scale;
      stampBrush(ctx, x, y, r);
    }
  }

  let markCtxBundle = null;

  function redrawMark() {
    if (!markCtxBundle) markCtxBundle = setupCanvas(markCanvas, MARK_LOGICAL);
    const { ctx } = markCtxBundle;
    const { svgX, svgY } = state.locate;
    drawZoomedBody(ctx, MARK_LOGICAL, svgX ?? VIEWBOX_W / 2, svgY ?? VIEWBOX_H / 2);

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (const s of state.strokes) drawStroke(ctx, s, 1);
    ctx.restore();
  }

  let isDrawing = false;
  let currentStroke = null;

  function startDrawing(evt) {
    if (state.step !== 2) return;
    evt.preventDefault();
    isDrawing = true;
    if (!markCtxBundle) markCtxBundle = setupCanvas(markCanvas, MARK_LOGICAL);
    const p = canvasPointFromPointer(evt, markCanvas, MARK_LOGICAL);
    currentStroke = {
      r: state.brush.r,
      points: [[Math.round(p.x), Math.round(p.y)]],
    };
    state.strokes.push(currentStroke);
    redrawMark();
  }

  function continueDrawing(evt) {
    if (!isDrawing || !currentStroke) return;
    const p = canvasPointFromPointer(evt, markCanvas, MARK_LOGICAL);
    currentStroke.points.push([Math.round(p.x), Math.round(p.y)]);
    redrawMark();
  }

  function endDrawing(evt) {
    if (!isDrawing) return;
    isDrawing = false;
    currentStroke = null;
  }

  function setupMarkInput() {
    const usePointer = "PointerEvent" in window;
    if (usePointer) {
      markCanvas.addEventListener("pointerdown", startDrawing);
      window.addEventListener("pointermove", continueDrawing);
      window.addEventListener("pointerup", endDrawing);
      window.addEventListener("pointercancel", endDrawing);
    } else {
      markCanvas.addEventListener("mousedown", startDrawing);
      window.addEventListener("mousemove", continueDrawing);
      window.addEventListener("mouseup", endDrawing);
      markCanvas.addEventListener("touchstart", startDrawing, { passive: false });
      window.addEventListener("touchmove", continueDrawing, { passive: false });
      window.addEventListener("touchend", endDrawing, { passive: false });
      window.addEventListener("touchcancel", endDrawing, { passive: false });
    }
  }

  let clockCtxBundle = null;
  let clockDragging = false;
  let clockTurns = 0; // 0..2 (two circles = 24h)
  let clockLastAngle = null;

  function timeToAngle(hour) {
    const h = ((hour ?? 0) % 24 + 24) % 24;
    const hClock = h % 12;
    const a = (hClock / 12) * Math.PI * 2;
    return a - Math.PI / 2;
  }

  function redrawClock() {
    if (state.step !== 3) return;
    if (!clockCtxBundle) clockCtxBundle = setupCanvas(clockCanvas, 220);
    const logical = clockCtxBundle.logicalSize;
    const ctx = clockCtxBundle.ctx;

    ctx.clearRect(0, 0, logical, logical);
    const c = logical / 2;
    const r = logical * 0.42;

    ctx.fillStyle = "#FBFBFA";
    ctx.beginPath();
    ctx.arc(c, c, logical * 0.49, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(120,130,135,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const len = 10;
      const w = 1.6;
      const x1 = c + Math.cos(a) * (r - len);
      const y1 = c + Math.sin(a) * (r - len);
      const x2 = c + Math.cos(a) * r;
      const y2 = c + Math.sin(a) * r;
      ctx.strokeStyle = "rgba(91,122,141,0.32)";
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    if (state.time != null) {
      clockTurns = state.time >= 24 ? 2 : state.time >= 12 ? 1 : 0;
      const a = timeToAngle(state.time);
      const hx = c + Math.cos(a) * (r * 0.82);
      const hy = c + Math.sin(a) * (r * 0.82);

      ctx.strokeStyle = "rgba(42,74,93,0.72)";
      ctx.lineWidth = 3.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.lineTo(hx, hy);
      ctx.stroke();

      ctx.fillStyle = "rgba(91,122,141,0.92)";
      ctx.beginPath();
      ctx.arc(c, c, 4.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(120,130,135,0.18)";
      ctx.beginPath();
      ctx.arc(c, c, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    timeReadout.textContent = `Time: ${state.time == null ? "—" : hourToLabel(state.time)}`;
  }

  function clockPoint(evt) {
    return canvasPointFromPointer(evt, clockCanvas, 220);
  }

  function setTimeFromEvent(evt) {
    const p = clockPoint(evt);
    const c = 110;
    const dx = p.x - c;
    const dy = p.y - c;
    const ang = Math.atan2(dy, dx);

    let a = ang + Math.PI / 2;
    while (a < 0) a += Math.PI * 2;
    while (a >= Math.PI * 2) a -= Math.PI * 2;

    if (clockLastAngle != null) {
      const diff = a - clockLastAngle;
      if (diff > Math.PI) {
        clockTurns = Math.max(0, clockTurns - 1);
      } else if (diff < -Math.PI) {
        clockTurns = Math.min(2, clockTurns + 1);
      }
    }
    clockLastAngle = a;

    const frac = a / (Math.PI * 2);
    let hour12 = Math.round(frac * 12) % 12;
    const hour = clamp(clockTurns * 12 + hour12, 0, 24);
    state.time = hour;
    redrawClock();
  }

  function setupClockInput() {
    const usePointer = "PointerEvent" in window;
    const down = (evt) => {
      evt.preventDefault();
      clockDragging = true;
      if (state.time == null) {
        state.time = 0;
        clockTurns = 0;
        const p = clockPoint(evt);
        const c = 110;
        const dx = p.x - c;
        const dy = p.y - c;
        let a = Math.atan2(dy, dx) + Math.PI / 2;
        while (a < 0) a += Math.PI * 2;
        while (a >= Math.PI * 2) a -= Math.PI * 2;
        clockLastAngle = a;
        redrawClock();
      } else {
        clockLastAngle = null;
        setTimeFromEvent(evt);
      }
    };
    const move = (evt) => {
      if (!clockDragging) return;
      evt.preventDefault();
      setTimeFromEvent(evt);
    };
    const up = (evt) => {
      if (!clockDragging) return;
      evt.preventDefault();
      clockDragging = false;
    };

    if (usePointer) {
      clockCanvas.addEventListener("pointerdown", down);
      clockCanvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    } else {
      clockCanvas.addEventListener("mousedown", down);
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      clockCanvas.addEventListener("touchstart", down, { passive: false });
      clockCanvas.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up, { passive: false });
      window.addEventListener("touchcancel", up, { passive: false });
    }
  }

  function updateSaveEnabled() {
    saveBtn.disabled = !state.classification;
  }

  function setClassification(value) {
    state.classification = value;
    classBtns.forEach((b) => b.classList.toggle("selected", b.dataset.class === value));
    updateSaveEnabled();
  }

  function setBrushRadius(r) {
    state.brush.r = r;
    brushSizeValue.textContent = `${r}px`;
  }

  function resetForNewSnapshot() {
    state = newState();
    locDot.classList.add("hidden");
    toStep2Btn.disabled = true;
    setBrushRadius(state.brush.r);
    brushSize.value = String(state.brush.r);

    state.strokes = [];
    state.classification = null;
    state.time = null;
    state.note = "";
    clockTurns = 0;
    clockLastAngle = null;

    classBtns.forEach((b) => b.classList.remove("selected"));
    noteInput.value = "";
    noteMeta.textContent = `0 / 200`;
    timeReadout.textContent = `Time: —`;
    updateSaveEnabled();

    showScreen("capture");
    showStep(1);
  }

  function saveSnapshot() {
    if (!state.classification) return;
    const snapshot = {
      timestamp: nowIso(),
      x: state.locate.x,
      y: state.locate.y,
      classification: state.classification,
      time: state.time == null ? null : state.time,
      note: (state.note || "").slice(0, 200),
      strokes: state.strokes.map((s) => ({
        r: Math.round(s.r),
        points: s.points.map((p) => [Math.round(p[0]), Math.round(p[1])]),
      })),
    };

    const hist = loadHistory();
    hist.unshift(snapshot);
    saveHistory(hist);
    downloadCsv(hist);
    showScreen("saved");
  }

  function snapshotToCsvRow(snap) {
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const strokesJson = JSON.stringify(snap.strokes || []);
    return [
      esc(snap.timestamp),
      snap.x == null ? "" : snap.x,
      snap.y == null ? "" : snap.y,
      esc(snap.classification),
      snap.time == null ? "" : snap.time,
      esc(snap.note || ""),
      esc(strokesJson),
    ].join(",");
  }

  function downloadCsv(history) {
    const header = "timestamp,x,y,classification,time,note,strokes";
    const rows = history.map(snapshotToCsvRow);
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "body-snapshots.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildHistoryList() {
    const hist = loadHistory();
    historyList.innerHTML = "";

    if (!hist.length) {
      const empty = document.createElement("div");
      empty.className = "detailEmpty";
      empty.textContent = "No snapshots yet.";
      historyList.appendChild(empty);
      return;
    }

    hist.forEach((snap, idx) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "historyItem";

      const left = document.createElement("div");
      left.className = "historyLeft";

      const icon = document.createElement("div");
      icon.className = "historyIcon";
      icon.textContent = iconForClass(snap.classification);

      const text = document.createElement("div");
      text.className = "historyText";

      const when = document.createElement("div");
      when.className = "historyWhen";
      when.textContent = formatWhen(snap.timestamp);

      const small = document.createElement("div");
      small.className = "historySmall";
      small.textContent = snap.note ? snap.note : "—";

      text.appendChild(when);
      text.appendChild(small);
      left.appendChild(icon);
      left.appendChild(text);

      const chevron = document.createElement("div");
      chevron.style.color = "rgba(91,103,115,0.7)";
      chevron.style.fontWeight = "800";
      chevron.textContent = "›";

      item.appendChild(left);
      item.appendChild(chevron);

      item.addEventListener("click", () => selectHistoryItem(idx));
      historyList.appendChild(item);
    });
  }

  function showHistoryDetail(show) {
    detailEmpty.classList.toggle("hidden", show);
    detailContent.classList.toggle("hidden", !show);
    if (!show) selectedHistoryIndex = null;
  }

  function drawSnapshotPreview(snap) {
    const bundle = setupCanvas(previewCanvas, PREVIEW_LOGICAL);
    const ctx = bundle.ctx;
    const svgX = (snap.x ?? 0.5) * VIEWBOX_W;
    const svgY = (snap.y ?? 0.5) * VIEWBOX_H;

    drawZoomedBody(ctx, PREVIEW_LOGICAL, svgX, svgY);

    const scale = PREVIEW_LOGICAL / MARK_LOGICAL;
    ctx.save();
    for (const s of snap.strokes || []) drawStroke(ctx, s, scale);
    ctx.restore();
  }

  function selectHistoryItem(idx) {
    const hist = loadHistory();
    const snap = hist[idx];
    if (!snap) return;

    selectedHistoryIndex = idx;
    showHistoryDetail(true);
    detailMeta.textContent = `${iconForClass(snap.classification)}  ${formatWhen(snap.timestamp)}`;
    detailTime.textContent = snap.time == null ? "—" : hourToLabel(snap.time);
    detailNote.textContent = snap.note ? snap.note : "—";

    ensureBodyImage().then(() => drawSnapshotPreview(snap));
  }

  function openHistory() {
    showScreen("history");
    showHistoryDetail(false);
    buildHistoryList();
  }

  function bindUI() {
    bodySvg.addEventListener("click", (evt) => {
      const p = svgPointFromEvent(evt, bodySvg);
      setLocate(p.x, p.y);
      showStep(2);
    });

    toStep2Btn.addEventListener("click", () => showStep(2));
    toStep3Btn.addEventListener("click", () => showStep(3));
    backTo1Btn.addEventListener("click", () => showStep(1));
    backTo2Btn.addEventListener("click", () => showStep(2));

    brushSize.addEventListener("input", () => {
      setBrushRadius(Number(brushSize.value));
    });

    undoBtn.addEventListener("click", () => {
      state.strokes.pop();
      redrawMark();
    });

    clearBtn.addEventListener("click", () => {
      state.strokes = [];
      redrawMark();
    });

    classBtns.forEach((b) => {
      b.addEventListener("click", () => setClassification(b.dataset.class));
    });

    clearTimeBtn.addEventListener("click", () => {
      state.time = null;
      clockTurns = 0;
      clockLastAngle = null;
      redrawClock();
    });

    noteInput.addEventListener("input", () => {
      state.note = noteInput.value.slice(0, 200);
      noteMeta.textContent = `${state.note.length} / 200`;
    });

    saveBtn.addEventListener("click", () => {
      saveSnapshot();
    });

    historyBtn.addEventListener("click", openHistory);
    viewHistoryBtn.addEventListener("click", openHistory);
    historyCloseBtn.addEventListener("click", () => {
      showScreen("capture");
      showStep(state.step || 1);
    });
    historyNewBtn.addEventListener("click", resetForNewSnapshot);
    newSnapshotBtn.addEventListener("click", resetForNewSnapshot);

    historyClearAllBtn.addEventListener("click", () => {
      saveHistory([]);
      buildHistoryList();
      showHistoryDetail(false);
    });

    detailBackBtn.addEventListener("click", () => showHistoryDetail(false));

    window.addEventListener("resize", () => {
      if (!screens.capture.classList.contains("hidden") && state.step === 2) redrawMark();
      if (!screens.history.classList.contains("hidden") && selectedHistoryIndex != null) {
        const hist = loadHistory();
        const snap = hist[selectedHistoryIndex];
        if (snap) ensureBodyImage().then(() => drawSnapshotPreview(snap));
      }
    });
  }

  function init() {
    state = newState();
    showScreen("capture");
    showStep(1);
    setBrushRadius(state.brush.r);
    setupMarkInput();
    setupClockInput();
    ensureBodyImage().then(() => {
      redrawMark();
      redrawClock();
    });
    bindUI();
  }

  init();
})();