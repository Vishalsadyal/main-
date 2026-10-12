// W3Tech Outreach Ext — sending leads to the W3Tech leads dashboard.
//
// The dashboard's database is the only place leads are kept. After every search the results
// go straight to POST /api/leads/ingest on each site in Options → Leads dashboard (by default
// http://localhost:3000 and https://www.w3tech.co.in). The dashboard checks duplicates against
// everything it already has, so resetting the extension can never create duplicates.
//
// The extension stores no leads. Only if a site can't be reached are that search's results kept
// in a small outbox, sent automatically next time and then removed.
//
// Loaded after w3tech-background.js and shares its helpers.
/* global W3Core, get, put, settings */

const P = { outbox: "w3outbox", last: "w3lastpush" }; // outbox: { "<site>": [rows…] }
const BATCH = 200;
const OUTBOX_MAX = 5000; // per site

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

/** A lead as the dashboard expects it. */
function payload(l, s) {
  return {
    key: l.key, business_name: l.name, listing_title: l.title, category: l.categoryLabel, category_key: l.category,
    phone: l.phone, whatsapp: W3Core.whatsappLink(l) || "", website: l.website, address: l.address, city: l.city,
    state: l.state, country: l.country, lat: l.lat, lon: l.lon, rating: l.rating, reviews: l.reviewCount,
    rating_source: l.ratingSource, score: l.score, priority: l.priority || W3Core.priorityFor(l.score),
    reasons: (l.reasons || []).filter((r) => r.points).map((r) => r.reason).join("; "),
    status: l.status || "new", maps_url: l.mapsUrl, demo_link: W3Core.demoLink(l, s), hunt: l.hunt, search: l.search,
    found_at: l.foundAt, search_rank: l.searchRank || "", competitors: l.competitors ? JSON.stringify(l.competitors) : ""
  };
}

async function health(site) {
  try {
    const h = await fetchJson(`${site}/api/leads/ingest`, { method: "GET" }, 6000);
    if (!h.data || h.data.service !== "w3tech-leads") {
      return h.status === 404 ? "Dashboard not on this site yet (deploy the latest website)" : "Not a W3Tech dashboard";
    }
    return h.data.ready ? "" : "Dashboard isn't set up (LEADS_API_KEY / database missing on the site)";
  } catch (err) {
    return "Not reachable";
  }
}

/** Send rows to one site (its outbox first). Whatever doesn't get through goes (back) in the outbox. */
async function sendToSite(site, rows, s) {
  const report = { site, reachable: false, sent: 0, added: 0, updated: 0, duplicates: 0, invalid: 0, problems: [], error: "", waiting: 0 };
  const box = await get(P.outbox, {});
  let queue = (box[site] || []).concat(rows);
  report.error = await health(site);
  report.reachable = report.error !== "Not reachable";
  if (!report.error) {
    while (queue.length) {
      const batch = queue.slice(0, BATCH);
      let res;
      try {
        res = await fetchJson(`${site}/api/leads/ingest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.dashboardKey}` },
          body: JSON.stringify({ leads: batch })
        }, 60000);
      } catch (err) {
        report.error = "Connection lost";
        break;
      }
      if (res.status === 401) { report.error = "Wrong API key — check Options → Leads dashboard"; break; }
      if (!res.data || !res.data.ok) { report.error = (res.data && res.data.error) || `Error ${res.status}`; break; }
      report.sent += batch.length;
      for (const k of ["added", "updated", "duplicates", "invalid"]) report[k] += res.data[k] || 0;
      report.problems.push(...(res.data.problems || []));
      queue = queue.slice(batch.length);
    }
  }
  const fresh = await get(P.outbox, {}); // re-read: another push may have run meanwhile
  if (queue.length) fresh[site] = queue.slice(-OUTBOX_MAX); else delete fresh[site];
  report.waiting = queue.length;
  await put({ [P.outbox]: fresh });
  return report;
}

/** Send leads to every dashboard site. Returns one report per site. */
async function pushRows(rows, s) {
  s = s || (await settings());
  const sites = siteList(s);
  if (!sites.length || !s.dashboardKey) throw new Error("Set up the leads dashboard in Options (site and API key).");
  const reports = [];
  for (const site of sites) reports.push(await sendToSite(site, rows, s));
  await put({ [P.last]: { at: new Date().toISOString(), reports } });
  return reports;
}

/** Searches the dashboard already has leads for ("dentist in ludhiana"…), from the first site that answers. */
async function searchedOnDashboard(s) {
  for (const site of siteList(s)) {
    try {
      const r = await fetchJson(`${site}/api/leads/searched`, { headers: { Authorization: `Bearer ${s.dashboardKey}` } }, 15000);
      if (r.data && r.data.ok) return { site, searches: new Set(r.data.searches || []), leads: r.data.leads || 0 };
    } catch (err) { /* try the next site */ }
  }
  return null;
}

async function pushStatus() {
  const s = await settings();
  const box = await get(P.outbox, {});
  const last = await get(P.last, null);
  return { sites: siteList(s).map((site) => ({ site, waiting: (box[site] || []).length })), hasKey: Boolean(s.dashboardKey), last };
}

async function handlePush(msg) {
  if (msg.type === "push") return { reports: await pushRows([], null) }; // send what's waiting in the outbox
  if (msg.type === "push-status") return pushStatus();
  throw new Error("Unknown request");
}
