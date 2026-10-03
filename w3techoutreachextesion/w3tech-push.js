// W3Tech Outreach Ext — "Push to dashboard".
//
// Sends leads to the W3Tech leads dashboard (POST /api/leads/ingest) on every site in
// Options → Dashboard (by default http://localhost:3000 and https://www.w3tech.co.in).
// A site that can't be reached is skipped and tried again next time. Each site remembers
// when it was last pushed, so only new and changed leads are sent again.
//
// Checked here before sending: a lead needs an id and a name; duplicates in this push
// (same phone, or same name in the same city) are sent once. The site checks again
// against everything it already has — it never stores the same business twice and
// never deletes anything.
//
// Loaded after w3tech-background.js and shares its helpers.
/* global W3Core, LEAD, get, put, settings, allLeads */

const P = { pushed: "w3pushed" }; // { "<site>": "<ISO time of the last successful push>" }
const BATCH = 200;

function siteList(s) {
  return [...new Set((s.dashboardSites || []).map((u) => String(u).trim().replace(/\/+$/, "")).filter((u) => /^https?:\/\//.test(u)))];
}

async function fetchJson(url, options = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, Object.assign({}, options, { signal: ctrl.signal, cache: "no-store" }));
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    return { status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function payload(l, s) {
  return {
    key: l.key, business_name: l.name, listing_title: l.title, category: l.categoryLabel, category_key: l.category,
    phone: l.phone, whatsapp: W3Core.whatsappLink(l) || "", website: l.website, address: l.address, city: l.city,
    state: l.state, country: l.country, lat: l.lat, lon: l.lon, rating: l.rating, reviews: l.reviewCount,
    rating_source: l.ratingSource, score: l.score, priority: l.priority || W3Core.priorityFor(l.score),
    reasons: (l.reasons || []).filter((r) => r.points).map((r) => r.reason).join("; "),
    status: l.status, maps_url: l.mapsUrl, demo_link: W3Core.demoLink(l, s), hunt: l.hunt, search: l.search,
    found_at: l.foundAt, sent_at: l.sentAt || "", last_message: l.lastMessage || "",
    search_rank: l.searchRank || "", competitors: l.competitors ? JSON.stringify(l.competitors) : ""
  };
}

// Valid, de-duplicated leads to send, and how many were left out locally.
function prepare(leads, s) {
  const seen = new Set();
  const out = [];
  let invalid = 0, duplicates = 0;
  for (const l of leads) {
    if (!l || !l.key || !l.name || String(l.name).trim().length < 2) { invalid++; continue; }
    const keys = W3Core.dedupeKeys(l).filter((k) => !k.startsWith("bing:"));
    if (seen.has(l.key) || keys.some((k) => seen.has(k))) { duplicates++; continue; }
    seen.add(l.key);
    keys.forEach((k) => seen.add(k));
    out.push(payload(l, s));
  }
  return { rows: out, invalid, duplicates };
}

async function pushToSite(site, leads, s) {
  const report = { site, reachable: false, sent: 0, added: 0, updated: 0, duplicates: 0, invalid: 0, problems: [], error: "" };
  let health;
  try {
    health = await fetchJson(`${site}/api/leads/ingest`, { method: "GET" }, 6000);
  } catch (err) {
    report.error = "Not reachable";
    return report;
  }
  if (!health.data || health.data.service !== "w3tech-leads") {
    report.error = health.status === 404 ? "Dashboard not on this site yet (deploy the latest website)" : "Not a W3Tech dashboard";
    return report;
  }
  report.reachable = true;
  if (!health.data.ready) { report.error = "Dashboard isn't set up (LEADS_API_KEY / database missing on the site)"; return report; }
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    let res;
    try {
      res = await fetchJson(`${site}/api/leads/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.dashboardKey}` },
        body: JSON.stringify({ leads: batch })
      }, 60000);
    } catch (err) {
      report.error = "Connection lost during the push";
      return report;
    }
    if (res.status === 401) { report.error = "Wrong API key — check Options → Dashboard"; return report; }
    if (!res.data || !res.data.ok) { report.error = (res.data && res.data.error) || `Error ${res.status}`; return report; }
    report.sent += batch.length;
    for (const k of ["added", "updated", "duplicates", "invalid"]) report[k] += res.data[k] || 0;
    report.problems.push(...(res.data.problems || []));
  }
  return report;
}

async function pushAll(force) {
  const s = await settings();
  const sites = siteList(s);
  if (!sites.length) throw new Error("Add a dashboard site in Options → Dashboard.");
  if (!s.dashboardKey) throw new Error("Add the dashboard API key in Options → Dashboard.");
  const all = await allLeads();
  const pushed = await get(P.pushed, {});
  const started = new Date().toISOString();
  const reports = [];
  for (const site of sites) {
    const since = force ? "" : pushed[site] || "";
    const changed = all.filter((l) => !since || String(l.updatedAt || l.foundAt || "") > since);
    const { rows, invalid, duplicates } = prepare(changed, s);
    if (!rows.length) {
      reports.push({ site, reachable: null, sent: 0, added: 0, updated: 0, duplicates, invalid, problems: [], error: "", nothing: true });
      continue;
    }
    const report = await pushToSite(site, rows, s);
    report.duplicates += duplicates;
    report.invalid += invalid;
    if (report.reachable && !report.error) pushed[site] = started;
    reports.push(report);
  }
  await put({ [P.pushed]: pushed });
  return { reports, total: all.length };
}

async function pushStatus() {
  const s = await settings();
  const pushed = await get(P.pushed, {});
  return { sites: siteList(s).map((site) => ({ site, lastPush: pushed[site] || "" })), hasKey: Boolean(s.dashboardKey) };
}

// After each search: push quietly; one push at a time, and an unreachable site is just retried later.
let autoPushing = null;
function autoPush() {
  if (autoPushing) return autoPushing;
  autoPushing = pushAll(false)
    .then((r) => put({ w3lastAutoPush: { at: new Date().toISOString(), reports: r.reports } }))
    .catch(() => {})
    .finally(() => { autoPushing = null; });
  return autoPushing;
}

async function handlePush(msg) {
  if (msg.type === "push") return pushAll(Boolean(msg.force));
  if (msg.type === "push-status") return pushStatus();
  throw new Error("Unknown request");
}
