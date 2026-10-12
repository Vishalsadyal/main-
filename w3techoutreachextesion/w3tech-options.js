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
  $("dashboardKey").value = s.dashboardKey || "";
  $("dashboardSites").value = (s.dashboardSites || []).join("\n");
  $("hotScore").value = s.hotScore;
  $("delayMin").value = s.delayMin;
  $("delayMax").value = s.delayMax;
  $("dailyLimit").value = s.dailyLimit;
}

function num(id, min, max) {
  const v = Number($(id).value);
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${$(id).parentElement.firstChild.textContent.trim()} must be ${min}–${max}.`);
  return v;
}

$("save").addEventListener("click", async () => {
  let settings;
  try {
    const dashboardSites = $("dashboardSites").value.split("\n").map((l) => l.trim().replace(/\/+$/, "")).filter(Boolean);
    for (const site of dashboardSites) {
      if (!/^https?:\/\/[\w.-]+(:\d+)?$/.test(site)) throw new Error(`Dashboard site “${site}” should look like https://www.w3tech.co.in or http://localhost:3000`);
    }
    const delayMin = num("delayMin", 1, 300), delayMax = num("delayMax", 1, 600);
    if (delayMax < delayMin) throw new Error("The pause “to” must be at least the pause “from”.");
    settings = { dashboardSites, dashboardKey: $("dashboardKey").value.trim(), 
      hotScore: num("hotScore", 0, 100), delayMin, delayMax, dailyLimit: num("dailyLimit", 1, 2000) };
  } catch (err) {
    return say(err.message, true);
  }
  const res = await call("save-settings", { settings });
  if (!res.ok) return say(res.error, true);
  say("Saved.");
  load();
});


load();
