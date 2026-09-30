/* global W3Core */
const $ = (id) => document.getElementById(id);
const call = (type, extra) => new Promise((resolve) =>
  chrome.runtime.sendMessage(Object.assign({ w3: true, type }, extra || {}), (res) => resolve(res || { ok: false })));

function say(text, isError) {
  $("msg").textContent = text;
  $("msg").className = isError ? "err" : "";
}

async function load() {
  const res = await call("options");
  if (!res.ok) return say(res.error || "Couldn't load settings.", true);
  const s = res.data.settings;
  $("sheetUrl").value = s.sheetUrl || "";
  $("sheetKey").value = s.sheetKey || "";
  $("sheetSync").checked = s.sheetSync !== false;
  $("hotScore").value = s.hotScore;
  $("message").value = s.message;
  $("demoLinks").value = Object.entries(s.demoLinks).map(([k, v]) => `${k} = ${v}`).join("\n");
  $("delayMin").value = s.delayMin;
  $("delayMax").value = s.delayMax;
  $("dailyLimit").value = s.dailyLimit;
  const st = await call("status");
  if (st.ok) {
    const n = st.data.stats;
    $("count").textContent = `${n.total.toLocaleString()} leads stored (${n.hot.toLocaleString()} good, ${n.sent.toLocaleString()} messaged` +
      `${n.unsynced ? `, ${n.unsynced.toLocaleString()} not yet in the Sheet` : ""}).`;
  }
}

function num(id, min, max) {
  const v = Number($(id).value);
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${$(id).parentElement.firstChild.textContent.trim()} must be ${min}–${max}.`);
  return v;
}

$("save").addEventListener("click", async () => {
  let settings;
  try {
    const url = $("sheetUrl").value.trim();
    if (url && !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) throw new Error("The Sheet URL must start with https://script.google.com/");
    const demoLinks = {};
    for (const line of $("demoLinks").value.split("\n")) {
      if (!line.trim()) continue;
      const [key, ...rest] = line.split("=");
      const link = rest.join("=").trim();
      if (!key.trim() || !(/^https?:\/\//.test(link) || W3Core.TEMPLATES.includes(link))) {
        throw new Error(`Line “${line.trim()}” should look like: dental = dentist  (a template)  or  dental = https://…`);
      }
      demoLinks[W3Core.normalizeCategory(key) || key.trim()] = link;
    }
    const delayMin = num("delayMin", 3, 300), delayMax = num("delayMax", 3, 600);
    if (delayMax < delayMin) throw new Error("The pause “to” must be at least the pause “from”.");
    settings = { sheetUrl: url, sheetKey: $("sheetKey").value.trim(), sheetSync: $("sheetSync").checked,
      hotScore: num("hotScore", 0, 100), message: $("message").value.trim() || W3Core.DEFAULT_MESSAGE, demoLinks,
      delayMin, delayMax, dailyLimit: num("dailyLimit", 1, 2000) };
  } catch (err) {
    return say(err.message, true);
  }
  const res = await call("save-settings", { settings });
  if (!res.ok) return say(res.error, true);
  say("Saved.");
  if (settings.sheetUrl && settings.sheetKey && settings.sheetSync) {
    const sync = await call("sync");
    if (sync.ok && sync.data && !sync.data.ok) say("Saved — but the Sheet said: " + sync.data.error, true);
    else if (sync.ok && sync.data && sync.data.saved) say(`Saved. ${sync.data.saved} leads copied to the Sheet.`);
  }
  load();
});

$("clear").addEventListener("click", async () => {
  if (!confirm("Delete every hunt lead stored in this browser? Leads already in your Google Sheet stay there.")) return;
  const res = await call("clear-leads");
  say(res.ok ? `Deleted ${res.data.removed} leads.` : res.error, !res.ok);
  load();
});

load();
