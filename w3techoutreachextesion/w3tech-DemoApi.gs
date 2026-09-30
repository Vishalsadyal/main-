/**
 * W3Tech Demo API — Google Apps Script for the "W3Tech Demos" Google Sheet.
 *
 * The sheet is the database for live demos on w3tech.co.in/demo/<slug>.
 * The W3Tech Sales Engine writes rows automatically when you click "Publish live";
 * you never need to add rows by hand.
 *   tab "Demos"  one row per demo (short ID, data columns and the rendered page)
 *   tab "Events" demo views and button clicks
 *   tab "Leads"  one row per lead you messaged from the Tasks page (updated on every send)
 *   tab "Hunt Leads" every business found by the W3Tech Outreach Ext browser extension
 *
 * SETUP (once)
 *   1. Create a Google Sheet, open Extensions → Apps Script, paste this file, Save.
 *   2. Project Settings → Script properties → add  DEMO_API_KEY = <long random secret>
 *      (the same value goes in the dashboard .env as SHEETS_API_KEY).
 *   3. Select the function `setup` and click Run once (authorise it) — it creates both tabs.
 *   4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *      Copy the web-app URL into the dashboard .env (SHEETS_API_URL) and Vercel (DEMO_SHEETS_URL).
 *
 * API
 *   GET  ?action=demo&slug=<slug-or-id>            -> published demo (public; used by the website)
 *   GET  ?action=events&key=<key>&after=<row>      -> events after a row number (dashboard)
 *   POST {key, action:"publish", demo:{...}}       -> insert/update a demo row (dashboard)
 *   POST {key, action:"unpublish", slug}           -> hide a demo (dashboard)
 *   POST {key, action:"saveLead", lead:{...}}      -> insert/update a lead row by lead_id (dashboard)
 *   POST {key, action:"saveHuntLeads", leads:[…]}  -> insert/update rows by "key" (browser extension)
 *   POST {action:"track", slug, event, page, meta}  -> record a view/click/engagement with the visitor's
 *                                                     IP, location and device (website; no key)
 */

var DEMO_COLUMNS = [
  "demo_id", "slug", "status", "link", "template", "business_name", "category", "city", "state", "phone",
  "whatsapp", "email", "address", "latitude", "longitude", "headline", "description", "services", "rating",
  "reviews", "logo_url", "primary_color", "secondary_color", "website", "facebook", "instagram", "lead_id",
  "published_at", "updated_at", "html"
];
var EVENT_COLUMNS = ["time", "demo_id", "slug", "event", "page", "detail", "visitor", "ip", "city", "region",
  "country", "device", "browser", "user_agent", "referrer"];
var LEAD_COLUMNS = ["lead_id", "business_name", "category", "phone", "whatsapp", "email", "website",
  "website_status", "address", "city", "state", "country", "score", "temperature", "status", "source", "maps_url",
  "demo_link", "last_action", "last_message", "last_contacted_at", "follow_ups", "first_saved_at", "updated_at"];
var HUNT_COLUMNS = ["key", "business_name", "listing_title", "category", "phone", "whatsapp", "website", "address",
  "city", "state", "country", "score", "reasons", "status", "maps_url", "demo_link", "hunt", "search", "found_at",
  "last_message", "sent_at", "updated_at"];
var EVENT_TYPES = ["view", "call", "whatsapp", "email", "cta_header", "cta_hero", "cta_appointment", "cta_contact",
  "section", "scroll", "leave"];
// Visitor details the website may send with an event, and their max lengths.
var EVENT_META = { detail: 100, visitor: 40, ip: 64, city: 100, region: 100, country: 10, device: 20, browser: 40,
  user_agent: 300, referrer: 300 };
var MAX_CELL = 49000; // Google Sheets cell limit is 50,000 characters
var COL = {};
DEMO_COLUMNS.forEach(function (c, i) { COL[c] = i + 1; });

function setup() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(book, "Demos", DEMO_COLUMNS);
  ensureSheet_(book, "Events", EVENT_COLUMNS);
  ensureSheet_(book, "Leads", LEAD_COLUMNS);
  ensureSheet_(book, "Hunt Leads", HUNT_COLUMNS);
}

function ensureSheet_(book, name, columns) {
  var sheet = book.getSheetByName(name) || book.insertSheet(name);
  // New sheet, or an older one with fewer columns: (re)write the header row.
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() < columns.length) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Keep untrusted text as text: "=HYPERLINK(...)" or "+91..." must not become a formula. */
function asText_(v) {
  if (typeof v === "string" && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function checkKey_(key) {
  var secret = PropertiesService.getScriptProperties().getProperty("DEMO_API_KEY");
  return Boolean(secret) && Boolean(key) && String(key) === secret;
}

function safeSlug_(slug) {
  slug = String(slug || "").toLowerCase();
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 120 ? slug : null;
}

function safeId_(id) {
  id = String(id || "").toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(id) ? id : null;
}

function demosSheet_() {
  return ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Demos", DEMO_COLUMNS);
}

/** Row number for a slug or a short demo ID, or -1. */
function findRow_(sheet, slugOrId) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var keys = sheet.getRange(2, 1, last - 1, 2).getValues(); // demo_id, slug
  var wanted = String(slugOrId || "");
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][1] === wanted.toLowerCase() || String(keys[i][0]).toUpperCase() === wanted.toUpperCase()) return i + 2;
  }
  return -1;
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === "demo") {
    var key = safeSlug_(p.slug) || safeId_(p.slug);
    if (!key) return json_({ ok: false, error: "bad slug" });
    var sheet = demosSheet_();
    var row = findRow_(sheet, key);
    if (row < 0) return json_({ ok: false, error: "not found" });
    var values = sheet.getRange(row, 1, 1, DEMO_COLUMNS.length).getValues()[0];
    var demo = {};
    DEMO_COLUMNS.forEach(function (col, i) { demo[col] = values[i]; });
    if (demo.status !== "published") return json_({ ok: false, error: "not found" });
    return json_({ ok: true, demo: demo });
  }
  if (p.action === "events") {
    if (!checkKey_(p.key)) return json_({ ok: false, error: "unauthorised" });
    var events = ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Events", EVENT_COLUMNS);
    var after = Math.max(1, parseInt(p.after || "1", 10) || 1);
    var last = events.getLastRow();
    if (last <= after) return json_({ ok: true, events: [], last_row: last });
    var rows = events.getRange(after + 1, 1, last - after, EVENT_COLUMNS.length).getValues();
    return json_({
      ok: true,
      last_row: last,
      events: rows.map(function (r) {
        var ev = {};
        EVENT_COLUMNS.forEach(function (col, i) { ev[col] = r[i]; });
        return ev;
      })
    });
  }
  return json_({ ok: true, app: "W3Tech Demo API" });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad json" }); }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (body.action === "track") return track_(body);
    if (!checkKey_(body.key)) return json_({ ok: false, error: "unauthorised" });
    if (body.action === "publish") return publish_(body.demo || {});
    if (body.action === "unpublish") return unpublish_(body.slug);
    if (body.action === "saveLead") return saveLead_(body.lead || {});
    if (body.action === "saveHuntLeads") return saveHuntLeads_(body.leads);
    return json_({ ok: false, error: "unknown action" });
  } finally {
    lock.releaseLock();
  }
}

function publish_(demo) {
  var slug = safeSlug_(demo.slug);
  var demoId = safeId_(demo.demo_id);
  if (!slug || !demoId) return json_({ ok: false, error: "bad slug or demo_id" });
  if (String(demo.html || "").length > MAX_CELL) return json_({ ok: false, error: "page too large for a sheet cell" });
  var sheet = demosSheet_();
  // Match on the demo ID first so a renamed demo (new slug) updates its own row.
  var row = findRow_(sheet, demoId);
  if (row < 0) row = findRow_(sheet, slug);
  var now = new Date().toISOString();
  var previousPublished = row > 0 ? sheet.getRange(row, COL.published_at).getValue() : "";
  var values = DEMO_COLUMNS.map(function (col) {
    if (col === "slug") return slug;
    if (col === "demo_id") return demoId;
    if (col === "status") return "published";
    if (col === "updated_at") return now;
    if (col === "published_at") return previousPublished || now;
    var v = demo[col];
    if (v === undefined || v === null) return "";
    if (typeof v === "object") v = JSON.stringify(v);
    // "+91 98…" would be read as a formula (#ERROR!); a leading ' keeps it as text.
    return asText_(v);
  });
  if (row > 0) sheet.getRange(row, 1, 1, DEMO_COLUMNS.length).setValues([values]);
  else sheet.appendRow(values);
  return json_({ ok: true, slug: slug, demo_id: demoId, updated: row > 0 });
}

function unpublish_(slug) {
  slug = safeSlug_(slug);
  var sheet = demosSheet_();
  var row = slug ? findRow_(sheet, slug) : -1;
  if (row < 0) return json_({ ok: false, error: "not found" });
  sheet.getRange(row, COL.status).setValue("hidden");
  sheet.getRange(row, COL.updated_at).setValue(new Date().toISOString());
  return json_({ ok: true, slug: slug });
}

function track_(body) {
  var key = safeSlug_(body.slug) || safeId_(body.slug);
  var event = String(body.event || "");
  if (!key || EVENT_TYPES.indexOf(event) < 0) return json_({ ok: false, error: "bad event" });
  var sheet = demosSheet_();
  var row = findRow_(sheet, key);
  if (row < 0 || sheet.getRange(row, COL.status).getValue() !== "published") return json_({ ok: false, error: "not found" });
  var ids = sheet.getRange(row, 1, 1, 2).getValues()[0];
  var events = ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Events", EVENT_COLUMNS);
  var meta = body.meta || {};
  var line = [new Date().toISOString(), ids[0], ids[1], event, asText_(String(body.page || "").slice(0, 200))];
  EVENT_COLUMNS.slice(5).forEach(function (col) {
    line.push(asText_(String(meta[col] === undefined || meta[col] === null ? "" : meta[col]).slice(0, EVENT_META[col])));
  });
  events.appendRow(line);
  return json_({ ok: true });
}

function saveLead_(lead) {
  var id = parseInt(lead.lead_id, 10);
  if (!(id > 0)) return json_({ ok: false, error: "bad lead_id" });
  var sheet = ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Leads", LEAD_COLUMNS);
  var row = -1;
  var last = sheet.getLastRow();
  if (last >= 2) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (parseInt(ids[i][0], 10) === id) { row = i + 2; break; }
    }
  }
  var now = new Date().toISOString();
  var firstSaved = row > 0 ? sheet.getRange(row, LEAD_COLUMNS.indexOf("first_saved_at") + 1).getValue() : "";
  var values = LEAD_COLUMNS.map(function (col) {
    if (col === "lead_id") return id;
    if (col === "updated_at") return now;
    if (col === "first_saved_at") return firstSaved || now;
    var v = lead[col];
    if (v === undefined || v === null) return "";
    return asText_(typeof v === "string" ? v.slice(0, MAX_CELL) : v);
  });
  if (row > 0) sheet.getRange(row, 1, 1, LEAD_COLUMNS.length).setValues([values]);
  else sheet.appendRow(values);
  return json_({ ok: true, lead_id: id, updated: row > 0 });
}

function saveHuntLeads_(leads) {
  if (!Array.isArray(leads) || leads.length > 500) return json_({ ok: false, error: "send 1-500 leads" });
  var sheet = ensureSheet_(SpreadsheetApp.getActiveSpreadsheet(), "Hunt Leads", HUNT_COLUMNS);
  var last = sheet.getLastRow();
  var rowOf = {};
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (r, i) { rowOf[String(r[0])] = i + 2; });
  }
  var now = new Date().toISOString();
  var fresh = [];
  var updated = 0;
  leads.forEach(function (lead) {
    var key = String((lead && lead.key) || "").slice(0, 200);
    if (!key || rowOf[key] === -1) return; // empty, or already in this batch
    var values = HUNT_COLUMNS.map(function (col) {
      if (col === "key") return key;
      if (col === "updated_at") return now;
      var v = lead[col];
      if (v === undefined || v === null) return "";
      return asText_(typeof v === "string" ? v.slice(0, MAX_CELL) : v);
    });
    if (rowOf[key] > 0) {
      sheet.getRange(rowOf[key], 1, 1, HUNT_COLUMNS.length).setValues([values]);
      updated++;
    } else {
      rowOf[key] = -1;
      fresh.push(values);
    }
  });
  if (fresh.length) sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, HUNT_COLUMNS.length).setValues(fresh);
  return json_({ ok: true, added: fresh.length, updated: updated });
}
