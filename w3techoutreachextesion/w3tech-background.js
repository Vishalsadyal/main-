// W3Tech Outreach Ext — hunt engine (runs in the extension's background, no server needed).
//
// A hunt = every town of the chosen states x every business type. The background keeps
// the hunt state in chrome.storage and moves ONE Bing Maps tab (the one where you pressed
// Start) from search to search. The panel script in that tab reads the results list and
// sends it back here, where leads are cleaned, scored, de-duplicated and stored — and
// copied to the Google Sheet if one is set up in Options.
/* global W3Core */

const K = { settings: "w3settings", hunt: "w3hunt", index: "w3index", day: "w3day", unsynced: "w3unsynced" };
const LEAD = "lead:";
const MAX_ATTEMPTS = 3;
const STUCK_MS = 3 * 60 * 1000;

// ------------------------------------------------------------ storage helpers
const get = async (key, fallback) => (await chrome.storage.local.get(key))[key] ?? fallback;
const put = (obj) => chrome.storage.local.set(obj);

async function settings() {
  const saved = await get(K.settings, {});
  return Object.assign({}, W3Core.DEFAULT_SETTINGS, saved, {
    demoLinks: Object.assign({}, W3Core.DEFAULT_DEMO_LINKS, saved.demoLinks || {})
  });
}

let countriesCache = null;
async function countries() {
  if (!countriesCache) {
    const res = await fetch(chrome.runtime.getURL("w3tech-data/countries.json"));
    countriesCache = (await res.json()).countries.map(([code, name, calling]) => ({ code, name, calling }));
  }
  return countriesCache;
}

async function towns(code) {
  if (!/^[A-Z]{2}$/.test(code)) throw new Error("Pick a country.");
  const res = await fetch(chrome.runtime.getURL(`w3tech-data/towns/${code}.json`));
  if (!res.ok) throw new Error("No town list for this country.");
  const data = await res.json();
  return data.towns.map(([name, s, pop, lat, lon]) => ({ name, state: data.states[s], pop, lat, lon }));
}

// States of a country with their town counts, biggest state first (the hunt order).
async function statesOf(code, minPop) {
  const byState = new Map();
  for (const t of await towns(code)) {
    if (t.pop < minPop) continue;
    const s = byState.get(t.state) || { state: t.state, towns: 0, pop: 0 };
    s.towns += 1; s.pop += t.pop;
    byState.set(t.state, s);
  }
  return [...byState.values()].sort((a, b) => b.pop - a.pop).map(({ state, towns }) => ({ state, towns }));
}

function today() { return new Date().toLocaleDateString("en-CA"); } // YYYY-MM-DD, local time

async function searchesToday() {
  const day = await get(K.day, {});
  return day.date === today() ? day.count : 0;
}
async function countSearch() {
  const n = (await searchesToday()) + 1;
  await put({ [K.day]: { date: today(), count: n } });
  return n;
}

// ------------------------------------------------------------ hunt
function stepAt(hunt, i) {
  const town = hunt.towns[Math.floor(i / hunt.terms.length)];
  const term = hunt.terms[i % hunt.terms.length];
  return { index: i, term, city: town[0], state: town[1], lat: town[3], lon: town[4],
           query: `${term} in ${town[0]}, ${town[1]}, ${hunt.country}` };
}

function searchUrl(step) {
  return `https://www.bing.com/maps?q=${encodeURIComponent(step.query).replace(/%20/g, "+")}` +
         `&cp=${step.lat.toFixed(5)}~${step.lon.toFixed(5)}&lvl=12`;
}

async function createHunt(form, tabId) {
  const list = await countries();
  const country = list.find((c) => c.code === form.country);
  if (!country) throw new Error("Pick a country.");
  const terms = [...new Set((form.terms || []).map((t) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 10);
  if (!terms.length) throw new Error("Add at least one business type.");
  const minPop = Number(form.minPop) || 20000;
  const chosen = new Set(form.states || []);
  const order = (await statesOf(country.code, minPop)).map((s) => s.state).filter((s) => !chosen.size || chosen.has(s));
  if (!order.length) throw new Error("Tick at least one state.");
  const all = (await towns(country.code)).filter((t) => t.pop >= minPop && order.includes(t.state));
  // State by state (biggest first), biggest town first inside each state.
  all.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || b.pop - a.pop);
  const s = await settings();
  const hunt = {
    id: Date.now(), name: `${terms.join(", ")} — ${order.length === 1 ? order[0] : country.name}`,
    country: country.name, countryCode: country.code, callingCode: country.calling, terms, minPop,
    maxPerSearch: Number(form.maxPerSearch) || s.maxPerSearch,
    towns: all.map((t) => [t.name, t.state, t.pop, t.lat, t.lon]),
    total: all.length * terms.length, next: 0, done: 0, failed: 0, attempts: {},
    found: 0, fresh: 0, hot: 0, byState: {}, recent: [], status: "running", tabId,
    pending: null, error: "", createdAt: new Date().toISOString(), waitUntil: null, lastAt: Date.now()
  };
  await put({ [K.hunt]: hunt });
  await goNext(hunt);
  return hunt;
}

async function saveHunt(hunt) { await put({ [K.hunt]: hunt }); }

// Send the hunt tab to the next search (or finish / wait for tomorrow).
async function goNext(hunt) {
  if (hunt.status !== "running") return saveHunt(hunt);
  if (hunt.next >= hunt.total) {
    hunt.status = "done"; hunt.pending = null;
    return saveHunt(hunt);
  }
  const s = await settings();
  if ((await searchesToday()) >= s.dailyLimit) {
    const tomorrow = new Date(); tomorrow.setHours(24, 1, 0, 0);
    hunt.waitUntil = tomorrow.getTime(); hunt.pending = null;
    await saveHunt(hunt);
    chrome.alarms.create("w3hunt-tomorrow", { when: hunt.waitUntil });
    return;
  }
  hunt.waitUntil = null;
  const step = stepAt(hunt, hunt.next);
  hunt.pending = { index: step.index, at: Date.now() };
  await saveHunt(hunt);
  try {
    await chrome.tabs.update(hunt.tabId, { url: searchUrl(step) });
  } catch (err) {
    hunt.status = "paused"; hunt.pending = null;
    hunt.error = "The hunt tab was closed. Open Bing Maps and press Resume in the W3Tech panel.";
    await saveHunt(hunt);
  }
}

// Results for one search from the hunt tab.
async function takeResults(hunt, msg) {
  if (!hunt.pending || hunt.pending.index !== msg.index) return { ignored: true };
  const step = stepAt(hunt, msg.index);
  if (msg.blocked) {
    hunt.status = "paused"; hunt.pending = null;
    hunt.error = "Bing is showing a CAPTCHA. Solve it in this tab (or wait a few hours), then press Resume.";
    await saveHunt(hunt);
    return { stop: true };
  }
  await countSearch();
  const s = await settings();
  const entities = W3Core.parseEntities(msg.raw || []).filter((e) => !e.closed).slice(0, hunt.maxPerSearch);
  const index = await get(K.index, {});
  const fresh = [];
  for (const e of entities) {
    const lead = W3Core.toLead(e, step, hunt);
    const keys = W3Core.dedupeKeys(lead);
    if (keys.some((k) => index[k])) continue;
    Object.assign(lead, W3Core.score(lead, s));
    keys.forEach((k) => { index[k] = lead.key; });
    fresh.push(lead);
  }
  const hot = fresh.filter((l) => l.hot).length;
  const writes = { [K.index]: index };
  fresh.forEach((l) => { writes[LEAD + l.key] = l; });
  await put(writes);

  const st = hunt.byState[step.state] || { done: 0, found: 0, fresh: 0, hot: 0 };
  st.done += 1; st.found += entities.length; st.fresh += fresh.length; st.hot += hot;
  hunt.byState[step.state] = st;
  hunt.found += entities.length; hunt.fresh += fresh.length; hunt.hot += hot; hunt.done += 1;
  hunt.recent = [{ term: step.term, city: step.city, found: entities.length, fresh: fresh.length, hot }]
    .concat(hunt.recent).slice(0, 8);
  hunt.next = msg.index + 1; hunt.pending = null; hunt.error = ""; hunt.lastAt = Date.now();
  await saveHunt(hunt);
  if (fresh.length && s.sheetSync) syncToSheet(fresh.map((l) => l.key)); // don't wait for Google
  if (hunt.next >= hunt.total) { await goNext(hunt); return { delay: 0, finished: true }; }
  const delay = s.delayMin + Math.random() * Math.max(0, s.delayMax - s.delayMin);
  return { delay: Math.round(delay), found: entities.length, fresh: fresh.length, hot };
}

async function failStep(hunt, reason) {
  const i = hunt.pending ? hunt.pending.index : hunt.next;
  hunt.attempts[i] = (hunt.attempts[i] || 0) + 1;
  if (hunt.attempts[i] >= MAX_ATTEMPTS) {
    const step = stepAt(hunt, i);
    hunt.failed += 1; hunt.next = i + 1;
    hunt.recent = [{ term: step.term, city: step.city, failed: true, reason }].concat(hunt.recent).slice(0, 8);
  }
  hunt.pending = null;
  await goNext(hunt);
}

// ------------------------------------------------------------ leads & sending
async function allLeads() {
  const everything = await chrome.storage.local.get(null);
  return Object.keys(everything).filter((k) => k.startsWith(LEAD)).map((k) => everything[k]);
}

async function sendList(limit = 30) {
  const s = await settings();
  const leads = (await allLeads())
    .filter((l) => l.hot && l.status === "new" && W3Core.whatsappLink(l))
    .sort((a, b) => b.score - a.score || a.foundAt.localeCompare(b.foundAt));
  return {
    total: leads.length,
    leads: leads.slice(0, limit).map((l) => {
      const message = W3Core.fillMessage(l, s);
      return { key: l.key, name: l.name, city: l.city, state: l.state, category: l.categoryLabel, score: l.score,
               phone: l.phone, website: l.website, mapsUrl: l.mapsUrl, message, whatsapp: W3Core.whatsappLink(l),
               reasons: l.reasons.filter((r) => r.points).map((r) => r.reason) };
    })
  };
}

async function updateLead(key, changes) {
  const lead = await get(LEAD + key, null);
  if (!lead) throw new Error("Lead not found.");
  Object.assign(lead, changes, { updatedAt: new Date().toISOString() });
  await put({ [LEAD + key]: lead });
  return lead;
}

async function stats() {
  const leads = await allLeads();
  const count = (f) => leads.filter(f).length;
  return { total: leads.length, hot: count((l) => l.hot), noWebsite: count((l) => !l.website),
           toSend: count((l) => l.hot && l.status === "new" && W3Core.whatsappLink(l)),
           sent: count((l) => l.status === "sent"), unsynced: (await get(K.unsynced, [])).length };
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"` : s;
}

async function exportCsv() {
  const cols = [["Name", "name"], ["Listing title", "title"], ["Category", "categoryLabel"], ["Phone", "phone"],
    ["Website", "website"], ["Address", "address"], ["City", "city"], ["State", "state"], ["Country", "country"],
    ["Latitude", "lat"], ["Longitude", "lon"], ["Bing Maps URL", "mapsUrl"], ["Score", "score"], ["Status", "status"],
    ["Found", "foundAt"], ["Hunt", "hunt"]];
  const rows = (await allLeads()).sort((a, b) => b.score - a.score);
  return [cols.map((c) => c[0]).join(",")]
    .concat(rows.map((l) => cols.map((c) => csvCell(l[c[1]])).join(","))).join("\r\n");
}

// ------------------------------------------------------------ Google Sheet
function sheetRow(l, s) {
  const wa = W3Core.whatsappNumber(l.phone, l.callingCode, l.countryCode);
  return { key: l.key, business_name: l.name, listing_title: l.title, category: l.categoryLabel, phone: l.phone,
    whatsapp: wa ? `https://wa.me/${wa}` : "", website: l.website, address: l.address, city: l.city, state: l.state,
    country: l.country, score: l.score, reasons: l.reasons.filter((r) => r.points).map((r) => r.reason).join("; "),
    status: l.status, maps_url: l.mapsUrl, demo_link: W3Core.demoLink(l, s), hunt: l.hunt, search: l.search,
    found_at: l.foundAt, last_message: l.lastMessage || "", sent_at: l.sentAt || "" };
}

let syncing = Promise.resolve();
function syncToSheet(keys) {
  syncing = syncing.then(() => doSync(keys)).catch(() => {});
  return syncing;
}

async function doSync(keys) {
  const s = await settings();
  const pending = [...new Set((await get(K.unsynced, [])).concat(keys || []))];
  if (!s.sheetUrl || !s.sheetKey) { await put({ [K.unsynced]: pending }); return { ok: false, error: "No Sheet set up in Options." }; }
  if (!pending.length) return { ok: true, saved: 0 };
  const batch = pending.slice(0, 200);
  const leads = (await chrome.storage.local.get(batch.map((k) => LEAD + k)));
  const rows = batch.map((k) => leads[LEAD + k]).filter(Boolean).map((l) => sheetRow(l, s));
  let data;
  try {
    const res = await fetch(s.sheetUrl, { method: "POST", headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ key: s.sheetKey, action: "saveHuntLeads", leads: rows }) });
    data = await res.json();
  } catch (err) {
    await put({ [K.unsynced]: pending });
    return { ok: false, error: "Couldn't reach the Google Sheet." };
  }
  if (!data.ok) {
    await put({ [K.unsynced]: pending });
    const error = data.error === "unknown action"
      ? "The Sheet's Apps Script is out of date — paste the latest DemoApi.gs and deploy a new version."
      : "Google Sheet: " + (data.error || "error");
    return { ok: false, error };
  }
  const rest = pending.slice(batch.length);
  await put({ [K.unsynced]: rest });
  if (rest.length) return doSync([]);
  return { ok: true, saved: rows.length };
}

// ------------------------------------------------------------ messages
async function handle(msg, sender) {
  const tabId = sender.tab && sender.tab.id;
  let hunt = await get(K.hunt, null);
  switch (msg.type) {
    case "options":
      return { countries: await countries(), settings: await settings(), searchesToday: await searchesToday() };
    case "states":
      return { states: await statesOf(msg.country, Number(msg.minPop) || 0) };
    case "status":
      return { hunt: hunt && publicHunt(hunt, tabId), stats: await stats() };
    case "start":
      if (hunt && hunt.status === "running") throw new Error("A hunt is already running — pause or stop it first.");
      hunt = await createHunt(msg.form, tabId);
      return { hunt: publicHunt(hunt, tabId) };
    case "pause":
      if (hunt) { hunt.status = "paused"; hunt.pending = null; await saveHunt(hunt); }
      return { hunt: hunt && publicHunt(hunt, tabId) };
    case "resume":
      if (!hunt || !["paused", "running"].includes(hunt.status)) throw new Error("Nothing to resume.");
      Object.assign(hunt, { status: "running", tabId, error: "", pending: null, lastAt: Date.now() });
      await goNext(hunt);
      return { hunt: publicHunt(hunt, tabId) };
    case "stop":
      if (hunt) { hunt.status = "stopped"; hunt.pending = null; await saveHunt(hunt); }
      return { hunt: hunt && publicHunt(hunt, tabId) };
    case "ready": // a Bing Maps page loaded: is it the hunt tab with a search to collect?
      if (hunt && hunt.status === "running" && hunt.tabId === tabId && hunt.pending) {
        const step = stepAt(hunt, hunt.pending.index);
        return { collect: Object.assign(step, { max: hunt.maxPerSearch }) };
      }
      return { collect: null };
    case "results":
      if (!hunt || hunt.tabId !== tabId || hunt.status !== "running") return { ignored: true };
      return takeResults(hunt, msg);
    case "next":
      if (hunt && hunt.status === "running" && hunt.tabId === tabId && !hunt.pending) await goNext(hunt);
      return { ok: true };
    case "send-list":
      return sendList(msg.limit);
    case "lead": {
      const changes = { status: msg.status };
      if (msg.status === "sent") Object.assign(changes, { sentAt: new Date().toISOString(), lastMessage: msg.message || "" });
      const lead = await updateLead(msg.key, changes);
      const s = await settings();
      if (s.sheetSync) syncToSheet([lead.key]);
      return { ok: true };
    }
    case "export":
      return { csv: await exportCsv() };
    case "sync":
      syncing = syncing.then(() => doSync([]), () => doSync([]));
      return syncing;
    case "save-settings": {
      const current = await get(K.settings, {});
      await put({ [K.settings]: Object.assign(current, msg.settings) });
      return { settings: await settings() };
    }
    case "open-options":
      chrome.runtime.openOptionsPage();
      return { ok: true };
    case "clear-leads": {
      const keys = Object.keys(await chrome.storage.local.get(null)).filter((k) => k.startsWith(LEAD));
      await chrome.storage.local.remove(keys.concat([K.index, K.unsynced]));
      return { removed: keys.length };
    }
    default:
      throw new Error("Unknown request");
  }
}

function publicHunt(h, tabId) {
  const current = h.pending ? stepAt(h, h.pending.index) : null;
  return { id: h.id, name: h.name, status: h.status, country: h.country, terms: h.terms, minPop: h.minPop,
    total: h.total, done: h.done, failed: h.failed, next: h.next, found: h.found, fresh: h.fresh, hot: h.hot,
    towns: h.towns.length, recent: h.recent, error: h.error, waitUntil: h.waitUntil,
    pct: h.total ? Math.round(((h.done + h.failed) / h.total) * 100) : 0,
    current: current && { term: current.term, city: current.city, state: current.state },
    isHuntTab: h.tabId === tabId,
    states: Object.entries(h.byState).map(([state, v]) => Object.assign({ state }, v)) };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.w3 !== true) return false; // not ours (the Maps Leads part has its own messages)
  handle(msg, sender).then((data) => sendResponse({ ok: true, data }),
                           (err) => sendResponse({ ok: false, error: err.message || String(err) }));
  return true;
});

// Watchdog: a search that never reported back (page hung, network) is retried, then skipped.
chrome.alarms.create("w3hunt-watchdog", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const hunt = await get(K.hunt, null);
  if (!hunt || hunt.status !== "running") return;
  if (alarm.name === "w3hunt-tomorrow" || (hunt.waitUntil && Date.now() >= hunt.waitUntil)) return goNext(hunt);
  if (alarm.name !== "w3hunt-watchdog") return;
  if (hunt.pending && Date.now() - hunt.pending.at > STUCK_MS) return failStep(hunt, "Page didn't load");
  // Between searches the tab counts down and asks for the next one; if it never does
  // (tab reloaded or navigated away), carry on from here.
  if (!hunt.pending && !hunt.waitUntil && Date.now() - (hunt.lastAt || 0) > STUCK_MS) return goNext(hunt);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const hunt = await get(K.hunt, null);
  if (hunt && hunt.tabId === tabId && hunt.status === "running") {
    Object.assign(hunt, { status: "paused", pending: null,
      error: "The hunt tab was closed. Open Bing Maps and press Resume in the W3Tech panel." });
    await saveHunt(hunt);
  }
});
