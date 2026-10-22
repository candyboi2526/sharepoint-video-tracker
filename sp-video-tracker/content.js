(() => {
  const STORE_KEY = "spwVideoState";
  const VIDEO_EXT = /\.(mp4|m4v|mov|mkv|webm|avi|wmv|mpg|mpeg)$/i;
  let state = {}; // key -> { opened: ISO string|null, watched: ISO string|null }

  /* ---------- storage ---------- */
  const load = () =>
    chrome.storage.local.get(STORE_KEY).then((r) => { state = r[STORE_KEY] || {}; });
  const save = () => chrome.storage.local.set({ [STORE_KEY]: state });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORE_KEY]) {
      state = changes[STORE_KEY].newValue || {};
      refresh();
    }
  });

  /* ---------- keys ---------- */
  const norm = (p) => (p || "").replace(/\/+$/, "").toLowerCase();
  const isPlayer = () => /stream\.aspx/i.test(location.pathname);

  function listFolder() {
    const id = new URLSearchParams(location.search).get("id");
    return norm(id || decodeURIComponent(location.pathname));
  }
  const keyFor = (folder, name) => `${folder}|${name}`;

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  /* ---------- state changes ---------- */
  function markOpened(key) {
    const s = state[key] || { opened: null, watched: null };
    if (s.opened) return;
    s.opened = new Date().toISOString();
    state[key] = s;
    save();
    refresh();
  }
  function toggleWatched(key) {
    const s = state[key] || { opened: null, watched: null };
    s.watched = s.watched ? null : new Date().toISOString();
    state[key] = s;
    save();
    refresh();
  }

  /* ---------- UI bits ---------- */
  function describe(key) {
    const s = state[key];
    if (s && s.watched) return { cls: "spw-watched", text: "✓ Watched", title: "Watched on " + fmt(s.watched), watched: true };
    if (s && s.opened)  return { cls: "spw-opened",  text: "Opened on " + fmt(s.opened), title: "", watched: false };
    return { cls: "", text: "", title: "", watched: false };
  }

  function fillWrap(wrap, key) {
    const d = describe(key);
    const status = wrap.querySelector(".spw-status");
    const btn = wrap.querySelector(".spw-btn");
    const cls = "spw-status " + d.cls;
    if (status.className !== cls) status.className = cls;
    if (status.textContent !== d.text) status.textContent = d.text;
    if (status.title !== d.title) status.title = d.title;
    const label = d.watched ? "Unmark" : "Mark watched";
    if (btn.textContent !== label) btn.textContent = label;
    wrap.dataset.spwKey = key;
    return d;
  }

  function makeWrap() {
    const wrap = document.createElement("span");
    wrap.className = "spw-wrap";
    const status = document.createElement("span");
    status.className = "spw-status";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "spw-btn";
    wrap.append(status, btn);
    // keep SharePoint's own row handlers (select / open) from seeing our clicks
    ["click", "dblclick", "mousedown", "pointerdown", "keydown"].forEach((t) =>
      wrap.addEventListener(t, (e) => e.stopPropagation())
    );
    btn.addEventListener("click", () => toggleWatched(wrap.dataset.spwKey));
    return wrap;
  }

  /* ---------- file list page ---------- */
  const dataRows = () =>
    [...document.querySelectorAll('[role="row"][data-automationid^="row-"]')].filter(
      (r) => r.dataset.automationid !== "row-header"
    );

  function rowInfo(row) {
    const cell = row.querySelector('[data-automationid="field-LinkFilename"]');
    if (!cell) return null;
    const span = cell.querySelector('[data-id="heroField"]');
    const name = ((span && (span.getAttribute("title") || span.textContent)) || "").trim();
    if (!VIDEO_EXT.test(name)) return null;
    return { cell, name };
  }

  function decorateRows() {
    const folder = listFolder();
    for (const row of dataRows()) {
      const info = rowInfo(row);
      if (!info) continue;
      const key = keyFor(folder, info.name);
      let wrap = info.cell.querySelector(":scope > .spw-wrap");
      if (!wrap) {
        wrap = makeWrap();
        info.cell.appendChild(wrap);
      }
      const d = fillWrap(wrap, key);
      row.classList.toggle("spw-row-watched", d.watched);
    }
  }

  function onOpenGesture(e) {
    if (isPlayer()) return;
    if (e.target.closest(".spw-wrap")) return;
    const row = e.target.closest('[role="row"][data-automationid^="row-"]');
    if (!row || row.dataset.automationid === "row-header") return;
    const info = rowInfo(row);
    if (!info) return;
    if (e.type === "click") {
      // single click only counts when it lands on the file name itself
      if (!e.target.closest('[data-id="heroField"]')) return;
    } else if (e.type === "keydown") {
      if (e.key !== "Enter") return;
    }
    markOpened(keyFor(listFolder(), info.name));
  }
  ["click", "dblclick", "keydown"].forEach((t) => document.addEventListener(t, onOpenGesture, true));

  /* ---------- video player page (stream.aspx?id=/path/file.mp4) ---------- */
  let playerKey = null;
  function playerPage() {
    const id = new URLSearchParams(location.search).get("id");
    if (!isPlayer() || !id) {
      playerKey = null;
      const old = document.getElementById("spw-panel");
      if (old) old.remove();
      return;
    }
    const clean = id.replace(/\/+$/, "");
    const slash = clean.lastIndexOf("/");
    const name = clean.slice(slash + 1);
    if (!VIDEO_EXT.test(name)) return;
    const key = keyFor(norm(clean.slice(0, slash)), name);

    let panel = document.getElementById("spw-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "spw-panel";
      panel.appendChild(makeWrap());
      document.body.appendChild(panel);
    }
    if (playerKey !== key) {
      playerKey = key;
      markOpened(key);
    }
    fillWrap(panel.firstChild, key);
  }

  /* ---------- wiring ---------- */
  function refresh() {
    decorateRows();
    playerPage();
  }

  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; refresh(); }, 150);
  };

  load().then(() => {
    refresh();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    let lastHref = location.href;
    setInterval(() => { if (location.href !== lastHref) { lastHref = location.href; refresh(); } }, 1000);
  });
})();
