// W3Tech Outreach Ext — the "W3Tech Hunt" panel on Bing Maps.
//
//  Hunt tab   asks what to hunt for (country, states, business types, town size), starts
//             the hunt and shows progress. The tab where you press Start does the hunting:
//             it moves town to town, reads the result list and hands it to the background.
//  Send tab   the best leads with their WhatsApp message ready: Open WhatsApp → press send
//             in WhatsApp → ✓ Sent. Nothing is ever sent without you.
//  Leads tab  totals, CSV export and Google Sheet sync.
(function () {
  if (window.__w3techHunt) return;
  window.__w3techHunt = true;

  const CARD = "[data-entity]";
  const LIST = ".b_lstcards";
  const BLOCK_WORDS = /captcha|unusual traffic|verify you are a human|are you a robot/i;
  const ui = { open: false, tab: "hunt", view: null, options: null, states: [], chosen: null, terms: [],
               form: null, status: null, send: null, busy: false, poll: null, countdown: null };

  // ------------------------------------------------------------ helpers
  function call(type, extra) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(Object.assign({ w3: true, type }, extra || {}), (res) => {
          if (chrome.runtime.lastError) resolve({ ok: false, error: "The extension was updated — refresh this page (F5)." });
          else resolve(res || { ok: false, error: "No answer from the extension." });
        });
      } catch (err) {
        resolve({ ok: false, error: "The extension was updated — refresh this page (F5)." });
      }
    });
  }
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function remember(k, v) { try { localStorage.setItem("w3hunt-" + k, JSON.stringify(v)); } catch (e) {} }
  function recall(k, d) { try { const v = localStorage.getItem("w3hunt-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }

  // ------------------------------------------------------------ shell
  const host = document.createElement("div");
  host.id = "w3tech-hunt-root";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS()}</style>
    <button class="launcher" type="button"><span class="dot"></span>W3Tech Hunt<span class="pill" hidden></span></button>
    <section class="panel" hidden>
      <header><strong>🎯 W3Tech Lead Hunt</strong><button class="x" type="button" aria-label="Close">×</button></header>
      <nav><button data-tab="hunt">Hunt</button><button data-tab="send">Send <span class="n"></span></button><button data-tab="leads">Leads</button></nav>
      <div class="body"></div>
    </section>`;
  document.documentElement.appendChild(host);
  const $ = (sel) => root.querySelector(sel);
  const body = $(".body");
  $(".launcher").addEventListener("click", () => toggle(!ui.open));
  $(".x").addEventListener("click", () => toggle(false));
  root.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

  function toggle(open) {
    ui.open = open;
    remember("open", open);
    $(".panel").hidden = !open;
    $(".launcher").classList.toggle("active", open);
    if (open) showTab(ui.tab);
    else stopPoll();
  }

  function showTab(tab) {
    ui.tab = tab;
    remember("tab", tab);
    root.querySelectorAll("nav button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    stopPoll();
    if (tab === "hunt") loadHunt();
    else if (tab === "send") loadSend();
    else loadLeads();
  }

  function startPoll(fn, ms) { stopPoll(); ui.poll = setInterval(fn, ms); }
  function stopPoll() { if (ui.poll) clearInterval(ui.poll); ui.poll = null; }
  function error(msg) { body.innerHTML = `<p class="err">${esc(msg)}</p>`; }
  function flash(msg, ok) {
    const el = $(".flash");
    if (!el) return;
    el.textContent = msg; el.hidden = false; el.className = "flash " + (ok ? "ok" : "err");
  }

  async function refreshBadge() {
    const res = await call("status");
    if (!res.ok) return;
    ui.status = res.data;
    const n = res.data.stats.toSend;
    const pill = $(".pill");
    pill.hidden = !n; pill.textContent = n;
    $("nav .n").textContent = n ? `(${n})` : "";
  }

  // ------------------------------------------------------------ Hunt tab
  async function loadHunt() {
    const res = await call("status");
    if (!res.ok) return error(res.error);
    ui.status = res.data;
    const h = res.data.hunt;
    if (h && ["running", "paused"].includes(h.status) && ui.view !== "form") return renderProgress();
    return showForm();
  }

  async function showForm() {
    ui.view = "form";
    if (!ui.options) {
      const res = await call("options");
      if (!res.ok) return error(res.error);
      ui.options = res.data;
      ui.form = recall("form", { country: "IN", minPop: 20000, maxPerSearch: 60 });
      ui.terms = recall("terms", []);
    }
    renderForm();
    loadStates();
  }

  async function loadStates() {
    const box = $(".states");
    if (box) box.innerHTML = `<p class="muted">Loading…</p>`;
    const res = await call("states", { country: ui.form.country, minPop: ui.form.minPop });
    if (!res.ok) { if (box) box.innerHTML = `<p class="err">${esc(res.error)}</p>`; return; }
    ui.states = res.data.states;
    const saved = recall("states-" + ui.form.country, null);
    ui.chosen = new Set(saved ? saved.filter((s) => ui.states.some((x) => x.state === s)) : ui.states.map((s) => s.state));
    renderStates();
  }

  const SUGGESTED = ["dentist", "dental clinic", "skin clinic", "eye hospital", "child specialist", "gynecologist",
    "physiotherapist", "dietitian", "salon", "gym", "restaurant", "cafe", "hotel", "real estate agent", "coaching centre"];

  function renderForm() {
    const f = ui.form, o = ui.options;
    const h = ui.status && ui.status.hunt;
    body.innerHTML = `
      <p class="muted">What should it hunt for? This tab then goes town by town on Bing Maps, collecting and scoring businesses.</p>
      <p class="flash" hidden></p>
      ${h && ["running", "paused"].includes(h.status) ? `<p class="note">A hunt is ${h.status}: <button class="link back">show it</button>. Starting a new one replaces it.</p>` : ""}
      <label>Country
        <select name="country">${o.countries.map((c) =>
          `<option value="${c.code}" ${c.code === f.country ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
      <div class="field"><span>Business types</span>
        <div class="chips">${ui.terms.map((t) => `<button type="button" class="chip on" data-remove="${esc(t)}">${esc(t)} ×</button>`).join("")
          || `<span class="muted small">None yet — pick below or type one.</span>`}</div>
        <div class="row"><input name="term" placeholder="e.g. dentist" maxlength="60"><button class="btn add" type="button">Add</button></div>
        <div class="chips">${SUGGESTED.filter((t) => !ui.terms.includes(t)).map((t) =>
          `<button type="button" class="chip" data-add="${esc(t)}">+ ${esc(t)}</button>`).join("")}</div></div>
      <div class="grid">
        <label>Towns with at least
          <select name="minPop">${[5000, 10000, 20000, 50000, 100000, 500000].map((n) =>
            `<option value="${n}" ${n == f.minPop ? "selected" : ""}>${fmt(n)} people</option>`).join("")}</select></label>
        <label>Results per search
          <select name="maxPerSearch">${[20, 40, 60, 100].map((n) =>
            `<option value="${n}" ${n == f.maxPerSearch ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      </div>
      <div class="field"><span>States <button type="button" class="link" data-all="1">All</button> · <button type="button" class="link" data-all="0">None</button></span>
        <div class="states"></div></div>
      <p class="summary muted"></p>
      <button class="btn primary go" type="button" ${ui.busy ? "disabled" : ""}>${ui.busy ? "Starting…" : "Start hunt in this tab"}</button>
      <p class="muted small">Leads scoring ${o.settings.hotScore}+ with a mobile number go to <b>Send</b>. Pauses ${o.settings.delayMin}–${o.settings.delayMax} s between searches, max ${fmt(o.settings.dailyLimit)} a day (change in Options).</p>`;

    const save = () => remember("form", ui.form);
    const on = (sel, ev, fn) => { const el = body.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    on("select[name=country]", "change", (e) => { f.country = e.target.value; save(); loadStates(); });
    on("select[name=minPop]", "change", (e) => { f.minPop = Number(e.target.value); save(); loadStates(); });
    on("select[name=maxPerSearch]", "change", (e) => { f.maxPerSearch = Number(e.target.value); save(); });
    on(".back", "click", () => { ui.view = null; renderProgress(); });
    const setTerms = (t) => { ui.terms = t.slice(0, 10); remember("terms", ui.terms); renderForm(); renderStates(); };
    const addTyped = () => {
      const typed = body.querySelector("input[name=term]").value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (typed.length) setTerms([...new Set(ui.terms.concat(typed))]);
    };
    on(".add", "click", addTyped);
    on("input[name=term]", "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } });
    body.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => setTerms(ui.terms.concat([b.dataset.add]))));
    body.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => setTerms(ui.terms.filter((t) => t !== b.dataset.remove))));
    body.querySelectorAll("[data-all]").forEach((b) => b.addEventListener("click", () => {
      ui.chosen = new Set(b.dataset.all === "1" ? ui.states.map((s) => s.state) : []);
      remember("states-" + f.country, [...ui.chosen]);
      renderStates();
    }));
    on(".go", "click", startHunt);
    renderStates();
  }

  function renderStates() {
    const box = $(".states");
    if (!box || !ui.chosen) return;
    box.innerHTML = ui.states.map((s, i) => `<label class="state"><input type="checkbox" data-i="${i}" ${ui.chosen.has(s.state) ? "checked" : ""}>
      <span>${esc(s.state)}</span><small>${fmt(s.towns)}</small></label>`).join("") || `<p class="muted">No towns that big — pick a smaller size.</p>`;
    box.querySelectorAll("input").forEach((c) => c.addEventListener("change", () => {
      const name = ui.states[Number(c.dataset.i)].state;
      if (c.checked) ui.chosen.add(name); else ui.chosen.delete(name);
      remember("states-" + ui.form.country, [...ui.chosen]);
      summary();
    }));
    summary();
  }

  function summary() {
    const el = $(".summary");
    if (!el) return;
    const towns = ui.states.filter((s) => ui.chosen.has(s.state)).reduce((n, s) => n + s.towns, 0);
    const searches = towns * ui.terms.length;
    const s = ui.options.settings;
    const hours = (searches * (35 + (s.delayMin + s.delayMax) / 2)) / 3600;
    const days = searches / s.dailyLimit;
    el.innerHTML = searches ? `<b>${fmt(towns)}</b> towns × ${ui.terms.length} type${ui.terms.length === 1 ? "" : "s"} = <b>${fmt(searches)}</b> searches
      (${days > 1 ? "about " + Math.ceil(days) + " days" : hours >= 1 ? "about " + hours.toFixed(1) + " hours" : "under an hour"}).`
      : "Pick business types and states.";
  }

  async function startHunt() {
    if (!ui.terms.length) return flash("Add at least one business type.");
    if (!ui.chosen.size) return flash("Tick at least one state.");
    const h = ui.status && ui.status.hunt;
    if (h && h.status === "running") {
      if (!confirm("Stop the running hunt and start this one?")) return;
      await call("stop");
    }
    ui.busy = true; renderForm();
    const all = ui.chosen.size === ui.states.length;
    const res = await call("start", { form: { country: ui.form.country, terms: ui.terms, minPop: ui.form.minPop,
      maxPerSearch: ui.form.maxPerSearch, states: all ? [] : [...ui.chosen] } });
    ui.busy = false;
    if (!res.ok) { renderForm(); renderStates(); return flash(res.error); }
    ui.view = null; // the tab now navigates to the first search
  }

  function renderProgress() {
    ui.view = "progress";
    const h = ui.status.hunt, st = ui.status.stats;
    const badge = { running: "Running", paused: "Paused", done: "Finished", stopped: "Stopped" }[h.status];
    const waiting = h.waitUntil ? `Daily limit reached — continues ${new Date(h.waitUntil).toLocaleString()}.` : "";
    const now = h.status !== "running" ? "" : waiting ||
      (ui.countdown != null ? `✓ Done. Next search in ${ui.countdown} s…`
        : h.current ? `🔎 ${h.isHuntTab ? "Collecting" : "Searching"} <b>${esc(h.current.term)}</b> in <b>${esc(h.current.city)}</b>, ${esc(h.current.state)}…`
        : "Working…");
    body.innerHTML = `
      <div class="title"><b>${esc(h.name)}</b><span class="badge ${h.status}">${badge}</span></div>
      <p class="muted small">${esc(h.country)} · ${fmt(h.towns)} towns over ${fmt(h.minPop)} · ${esc(h.terms.join(", "))}</p>
      ${h.error ? `<p class="err">${esc(h.error)}</p>` : ""}
      <div class="bar"><span style="width:${h.pct}%"></span></div>
      <p class="muted small">${fmt(h.done)} of ${fmt(h.total)} searches (${h.pct}%)${h.failed ? ` · ${h.failed} skipped after errors` : ""}</p>
      ${now ? `<p class="now">${now}</p>` : ""}
      ${h.status === "running" && !h.isHuntTab ? `<p class="note">The hunt runs in another Bing Maps tab. Keep that tab open (best in its own window). <button class="link here">Move it to this tab</button></p>` : ""}
      ${h.status === "running" && h.isHuntTab ? `<p class="note">This tab is doing the hunt — keep it open. Use another tab or window for other work.</p>` : ""}
      <div class="stats">
        <div><b>${fmt(h.found)}</b><small>found</small></div><div><b>${fmt(h.fresh)}</b><small>new leads</small></div>
        <div><b>${fmt(h.hot)}</b><small>good leads</small></div><div><b>${fmt(st.toSend)}</b><small>to send</small></div>
      </div>
      ${h.recent.length ? `<ul class="recent">${h.recent.map((r) => `<li><span>${esc(r.term)} · ${esc(r.city)}</span>
        <small>${r.failed ? "skipped: " + esc(r.reason) : `${r.found} found · ${r.fresh} new${r.hot ? " · " + r.hot + " good" : ""}`}</small></li>`).join("")}</ul>` : ""}
      <p class="flash" hidden></p>
      <div class="actions">
        ${h.status === "running" ? `<button class="btn" data-act="pause">Pause</button>` : ""}
        ${h.status === "paused" ? `<button class="btn primary" data-act="resume">Resume in this tab</button>` : ""}
        ${["running", "paused"].includes(h.status) ? `<button class="btn danger" data-act="stop">Stop</button>` : ""}
        <button class="btn newhunt">New hunt</button>
        ${st.toSend ? `<button class="btn primary gosend">Send ${st.toSend} →</button>` : ""}
      </div>`;
    body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => control(b.dataset.act)));
    const here = body.querySelector(".here");
    if (here) here.addEventListener("click", () => control("resume"));
    body.querySelector(".newhunt").addEventListener("click", () => { stopPoll(); showForm(); });
    const gs = body.querySelector(".gosend");
    if (gs) gs.addEventListener("click", () => showTab("send"));
    if (h.status === "running" && !ui.poll) startPoll(async () => {
      const res = await call("status");
      if (!res.ok || ui.view !== "progress" || ui.tab !== "hunt") return;
      ui.status = res.data;
      renderProgress();
      refreshBadge();
    }, 4000);
  }

  async function control(action) {
    if (action === "stop" && !confirm("Stop this hunt? The leads it found are kept.")) return;
    const res = await call(action);
    if (!res.ok) return flash(res.error);
    stopPoll();
    loadHunt();
  }

  // ------------------------------------------------------------ Send tab
  async function loadSend() {
    ui.view = "send";
    const res = await call("send-list", { limit: 20 });
    if (!res.ok) return error(res.error);
    const { leads, total } = res.data;
    if (!leads.length) {
      body.innerHTML = `<div class="empty"><p><b>Nothing to send right now.</b></p>
        <p class="muted">Good leads (with a mobile number) appear here while a hunt runs.</p></div>`;
      return refreshBadge();
    }
    body.innerHTML = `<p class="muted small">${fmt(total)} lead${total === 1 ? "" : "s"} to message, best first. <b>Open WhatsApp</b> fills in the text — check it, press send in WhatsApp, then <b>✓ Sent</b>.</p>
      <p class="flash" hidden></p>` +
      leads.map((l, i) => `<article class="lead" data-i="${i}">
        <div class="lead-head"><b>${esc(l.name)}</b><span class="score">${l.score}</span></div>
        <p class="muted small">${esc(l.category)} · ${esc(l.city)}${l.state ? ", " + esc(l.state) : ""} · ${esc(l.phone)}
          · <a href="${esc(l.mapsUrl)}" target="_blank">map ↗</a>${l.website ? ` · <a href="${esc(l.website)}" target="_blank" rel="noreferrer">site ↗</a>` : ""}</p>
        <p class="small why">${l.reasons.map(esc).join(" · ")}</p>
        <textarea rows="4">${esc(l.message)}</textarea>
        <div class="actions"><button class="btn primary wa">Open WhatsApp</button><button class="btn sent">✓ Sent</button>
          <button class="btn skip">Skip</button></div></article>`).join("");
    body.querySelectorAll(".lead").forEach((card) => {
      const lead = leads[Number(card.dataset.i)];
      const text = () => card.querySelector("textarea").value;
      card.querySelector(".wa").addEventListener("click", () => {
        window.open(`https://wa.me/${waDigits(lead)}?text=${encodeURIComponent(text())}`, "_blank", "noopener");
        card.querySelector(".sent").classList.add("primary");
      });
      card.querySelector(".sent").addEventListener("click", () => mark(lead, "sent", text()));
      card.querySelector(".skip").addEventListener("click", () => mark(lead, "skipped", ""));
    });
    refreshBadge();
  }

  function waDigits(lead) { return (lead.whatsapp || "").replace(/\D/g, ""); }

  async function mark(lead, status, message) {
    const res = await call("lead", { key: lead.key, status, message });
    if (!res.ok) return flash(res.error);
    loadSend();
  }

  // ------------------------------------------------------------ Leads tab
  async function loadLeads() {
    ui.view = "leads";
    const res = await call("status");
    if (!res.ok) return error(res.error);
    const st = res.data.stats;
    body.innerHTML = `
      <div class="stats">
        <div><b>${fmt(st.total)}</b><small>leads</small></div><div><b>${fmt(st.noWebsite)}</b><small>no website</small></div>
        <div><b>${fmt(st.hot)}</b><small>good</small></div><div><b>${fmt(st.sent)}</b><small>messaged</small></div>
      </div>
      <p class="flash" hidden></p>
      <div class="actions"><button class="btn primary csv">Download CSV</button><button class="btn sync">Save to Google Sheet${st.unsynced ? ` (${fmt(st.unsynced)} waiting)` : ""}</button></div>
      <p class="muted small">Leads are kept in this browser${st.unsynced ? "" : " and copied to your Google Sheet as they're found"}.
        The CSV imports straight into the W3Tech Sales Engine (Leads → Import).
        Sheet, message text, sample-site links and speed: <button class="link opts">Options</button>.</p>`;
    body.querySelector(".csv").addEventListener("click", async () => {
      const r = await call("export");
      if (!r.ok) return flash(r.error);
      const url = URL.createObjectURL(new Blob(["﻿" + r.data.csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url; a.download = `w3tech-leads-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
    body.querySelector(".sync").addEventListener("click", async () => {
      flash("Saving…", true);
      const r = await call("sync");
      if (!r.ok) return flash(r.error);
      if (!r.data.ok) return flash(r.data.error);
      flash(`Saved to the Google Sheet.`, true);
      setTimeout(loadLeads, 1500);
    });
    body.querySelector(".opts").addEventListener("click", () => call("open-options"));
  }

  // ------------------------------------------------------------ collector (hunt tab only)
  async function collect(step) {
    toggle(true);
    showTab("hunt");
    const started = Date.now();
    while (!document.querySelector(CARD) && Date.now() - started < 25000) await sleep(500);
    if (!document.querySelector(CARD)) {
      const blocked = BLOCK_WORDS.test(document.body ? document.body.innerText : "");
      return report(step, [], blocked);
    }
    await sleep(1500);
    const seen = new Set();
    const raw = [];
    const read = () => document.querySelectorAll(CARD).forEach((el) => {
      const id = el.dataset.entityId || el.id;
      if (id && !seen.has(id)) { seen.add(id); raw.push(el.dataset.entity || ""); }
    });
    read();
    let stale = 0;
    for (let i = 0; i < 25 && raw.length < step.max && stale < 2; i++) {
      const cards = document.querySelectorAll(`${LIST} ${CARD}`);
      const list = document.querySelector(LIST);
      if (!list || !cards.length) break;
      cards[cards.length - 1].scrollIntoView({ block: "end" });
      list.scrollTop = list.scrollHeight;
      list.dispatchEvent(new WheelEvent("wheel", { deltaY: 1200, bubbles: true }));
      await sleep(2200);
      const before = raw.length;
      read();
      stale = raw.length === before ? stale + 1 : 0;
    }
    return report(step, raw, false);
  }

  async function report(step, raw, blocked) {
    const res = await call("results", { index: step.index, raw, blocked });
    if (!res.ok || !res.data || res.data.ignored || res.data.stop || res.data.finished) { loadHunt(); refreshBadge(); return; }
    // Pause between searches, visible in the panel; then ask for the next one.
    for (let s = res.data.delay; s > 0; s--) {
      ui.countdown = s;
      if (ui.view === "progress") {
        const st = await call("status");
        if (st.ok) { ui.status = st.data; if (st.data.hunt.status !== "running") { ui.countdown = null; return renderProgress(); } }
        if (ui.tab === "hunt") renderProgress();
      }
      await sleep(1000);
    }
    ui.countdown = null;
    await call("next");
  }

  // ------------------------------------------------------------ start
  (async function init() {
    ui.tab = recall("tab", "hunt");
    const res = await call("ready");
    if (res.ok && res.data.collect) return collect(res.data.collect);
    if (recall("open", false)) toggle(true);
    refreshBadge();
  })();

  function CSS() {
    return `
      :host { all: initial; }
      * { box-sizing: border-box; font-family: "Segoe UI", system-ui, sans-serif; }
      .launcher { position: fixed; z-index: 2147483000; left: 16px; bottom: 16px; display: flex; align-items: center; gap: 8px;
        padding: 10px 16px; border: 0; border-radius: 999px; background: #2563eb; color: #fff; font-size: 14px; font-weight: 600;
        cursor: pointer; box-shadow: 0 6px 20px rgba(15,23,42,.25); }
      .launcher:hover, .launcher.active { background: #1d4ed8; }
      .dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px rgba(255,255,255,.35); }
      .pill { background: #dc2626; border-radius: 99px; padding: 0 7px; font-size: 12px; }
      .pill[hidden] { display: none; }
      .panel { position: fixed; z-index: 2147483000; left: 16px; bottom: 70px; width: 390px; max-width: calc(100vw - 32px);
        max-height: calc(100vh - 100px); display: flex; flex-direction: column; background: #fff; color: #0f172a;
        border-radius: 14px; box-shadow: 0 18px 50px rgba(15,23,42,.3); overflow: hidden; font-size: 13px; }
      .panel[hidden] { display: none; }
      header { display: flex; justify-content: space-between; align-items: center; padding: 11px 16px; background: #0f172a; color: #fff; font-size: 14px; }
      .x { background: none; border: 0; color: #cbd5e1; font-size: 22px; line-height: 1; cursor: pointer; }
      nav { display: flex; border-bottom: 1px solid #e2e8f0; }
      nav button { flex: 1; padding: 9px 0; border: 0; background: #fff; color: #64748b; font: inherit; font-weight: 600; cursor: pointer;
        border-bottom: 2px solid transparent; }
      nav button.on { color: #2563eb; border-bottom-color: #2563eb; }
      .body { padding: 14px 16px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 11px; }
      p { margin: 0; line-height: 1.45; }
      .muted { color: #64748b; } .small { font-size: 12px; }
      .err, .flash.err { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 10px; }
      .flash.ok { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 10px; }
      .flash[hidden] { display: none; }
      .note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; }
      label, .field { display: flex; flex-direction: column; gap: 5px; font-weight: 600; font-size: 12.5px; }
      select, input:not([type=checkbox]), textarea { font: inherit; font-weight: 400; padding: 7px 9px; border: 1px solid #cbd5e1;
        border-radius: 8px; background: #fff; color: #0f172a; width: 100%; }
      textarea { resize: vertical; font-size: 12.5px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .row { display: flex; gap: 6px; }
      .chips { display: flex; flex-wrap: wrap; gap: 5px; font-weight: 400; }
      .chip { border: 1px solid #cbd5e1; background: #f8fafc; color: #334155; border-radius: 999px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
      .chip:hover { border-color: #2563eb; color: #2563eb; }
      .chip.on { background: #2563eb; border-color: #2563eb; color: #fff; }
      .states { max-height: 170px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px 8px; font-weight: 400; }
      .state { flex-direction: row; align-items: center; gap: 8px; padding: 3px 0; font-weight: 400; cursor: pointer; }
      .state span { flex: 1; } .state small { color: #64748b; }
      .link { background: none; border: 0; color: #2563eb; cursor: pointer; font: inherit; font-weight: 500; padding: 0; }
      .btn { font: inherit; font-weight: 600; padding: 7px 12px; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; color: #0f172a; cursor: pointer; }
      .btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
      .btn.danger { color: #b91c1c; border-color: #fecaca; }
      .btn:disabled { opacity: .6; cursor: default; }
      .go { width: 100%; padding: 10px; font-size: 14px; }
      .title { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 14px; }
      .badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: #e2e8f0; color: #334155; white-space: nowrap; }
      .badge.running { background: #dcfce7; color: #15803d; } .badge.paused { background: #fef3c7; color: #b45309; }
      .badge.done { background: #dbeafe; color: #1d4ed8; }
      .bar { height: 10px; border-radius: 99px; background: #eef2f7; overflow: hidden; }
      .bar span { display: block; height: 100%; min-width: 4px; background: #2563eb; border-radius: 99px; transition: width .4s; }
      .now { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px 10px; }
      .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; }
      .stats div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 4px; }
      .stats b { display: block; font-size: 17px; } .stats small { color: #64748b; font-size: 11px; }
      .recent { list-style: none; margin: 0; padding: 0; border-top: 1px solid #e2e8f0; }
      .recent li { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
      .recent small { color: #64748b; white-space: nowrap; }
      .actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .lead { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
      .lead-head { display: flex; justify-content: space-between; gap: 8px; }
      .score { background: #dcfce7; color: #15803d; font-weight: 700; border-radius: 99px; padding: 0 8px; font-size: 12px; }
      .why { color: #15803d; }
      .lead a, .note a { color: #2563eb; text-decoration: none; }
      .empty { text-align: center; padding: 18px 0; display: flex; flex-direction: column; gap: 6px; }`;
  }
})();
