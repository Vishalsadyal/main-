// W3Tech Outreach Ext — shared logic (used by the background worker, the Bing Maps panel
// and the options page): reading Bing Maps listings, cleaning, scoring, de-duplicating
// and filling in WhatsApp messages. No network, no storage — plain functions.
(function (g) {
  "use strict";

  // Social / listing pages: a business with only these has no real website.
  const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "fb.com", "m.facebook.com", "wa.me", "api.whatsapp.com",
    "linktr.ee", "sites.google.com", "google.com", "g.page", "business.site", "maps.app.goo.gl", "goo.gl", "bit.ly",
    "youtube.com", "twitter.com", "x.com", "linkedin.com", "justdial.com", "practo.com", "sulekha.com",
    "indiamart.com", "zomato.com", "swiggy.com", "tripadvisor.com", "tripadvisor.in", "t.me"];

  const STATE_ABBREVIATIONS = { PB: "Punjab", HP: "Himachal Pradesh", HR: "Haryana", CH: "Chandigarh", DL: "Delhi",
    JK: "Jammu and Kashmir", UK: "Uttarakhand", UP: "Uttar Pradesh", RJ: "Rajasthan", MH: "Maharashtra",
    GJ: "Gujarat", KA: "Karnataka", TN: "Tamil Nadu", WB: "West Bengal", KL: "Kerala", AP: "Andhra Pradesh",
    TG: "Telangana", TS: "Telangana", MP: "Madhya Pradesh", CG: "Chhattisgarh", OD: "Odisha", OR: "Odisha",
    BR: "Bihar", JH: "Jharkhand", AS: "Assam", GA: "Goa" };

  const CATEGORY_WORDS = [
    [/dent|odont/, "dental"], [/skin|derma|cosmetic|aesthetic/, "skin"], [/eye|ophthal|optic/, "eye"],
    [/child|paediat|pediat/, "child"], [/gyn|obstet|maternity|ivf|fertility/, "women"],
    [/diet|nutrition|weight|slim/, "diet"], [/physio/, "physio"], [/plastic surg/, "plastic_surgery"],
    [/salon|beauty|spa|parlou?r/, "salon"], [/gym|fitness/, "gym"], [/restaurant|dhaba|food/, "restaurant"],
    [/cafe|coffee/, "cafe"], [/bakery|sweet/, "bakery"], [/hotel|guest ?house|lodg/, "hotel"],
    [/hospital/, "hospital"], [/clinic|doctor|physician|medical/, "clinic"], [/pharmac|chemist/, "pharmacy"],
    [/real ?estate|propert/, "real_estate"], [/school/, "school"],
    [/coaching|academy|institute|college|tuition/, "coaching"], [/lawyer|advocate|accountant|\bca\b/, "professional"],
    [/car (repair|service)|garage|workshop/, "car_service"]
  ];

  // Website template for each trade (editable in Options). A template name gives a
  // personalised preview with the business's own name, city and phone:
  //   https://www.w3tech.co.in/for/dentist/the-smile-edit-mumbai?n=The+Smile+Edit&c=Mumbai&p=91…
  // A full link (https://…) is used as it is.
  const TEMPLATES = ["dentist", "medical", "ophthalmology", "pediatrics", "gynecology", "skincare", "plasticsurgery",
    "dieting", "fatloss"];
  const DEFAULT_DEMO_LINKS = {
    dental: "dentist", clinic: "medical", hospital: "medical", physio: "medical", eye: "ophthalmology",
    child: "pediatrics", women: "gynecology", skin: "skincare", plastic_surgery: "plasticsurgery", diet: "dieting",
    other: "https://www.w3tech.co.in/"
  };
  const PREVIEW_BASE = "https://www.w3tech.co.in";

  const DEFAULT_MESSAGE =
    "Hi {name}! 👋\n\n" +
    "I found {name} on the map{in_city} and {pitch}\n\n" +
    "I'm from W3Tech — we build fast, mobile-friendly websites with WhatsApp and call buttons so patients " +
    "and customers can reach you in one tap. I made a quick preview of how your website could look:\n{demo_link}\n\n" +
    "Shall I finish it with your photos, services and timings? It takes a couple of days. 🙂";

  const DEFAULT_SETTINGS = {
    hotScore: 60,           // leads at/above this go to the Send list
    delayMin: 8,            // seconds between searches (random between min and max)
    delayMax: 20,
    dailyLimit: 300,        // searches per day
    maxPerSearch: 60,
    message: DEFAULT_MESSAGE,
    demoLinks: DEFAULT_DEMO_LINKS,
    sheetUrl: "",           // Apps Script web-app URL (sheets/DemoApi.gs)
    sheetKey: "",           // DEMO_API_KEY
    sheetSync: true
  };

  const POINTS = { no_website: 40, social_only: 35, local_business: 10, phone: 5, whatsapp: 5, sample_site: 7 };

  function digits(text) { return String(text || "").replace(/\D/g, ""); }

  function normalizeCategory(text) {
    const t = String(text || "").trim().toLowerCase();
    if (!t) return "";
    for (const [re, key] of CATEGORY_WORDS) if (re.test(t)) return key;
    return t.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
  }

  // "Jolly Dental Care - Best Implant Centre in X | RCT" -> "Jolly Dental Care"
  function cleanName(title) {
    const name = String(title || "").normalize("NFKC");
    const short = name.split(/\s?[-–|:]\s|\s*[|/(]/)[0].trim();
    return short || name.trim();
  }

  function domainOf(url) {
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
      return u.hostname.toLowerCase().replace(/^www\./, "");
    } catch (e) { return ""; }
  }
  function isSocial(url) { return SOCIAL_HOSTS.includes(domainOf(url)); }

  // "Model Town, Ludhiana, Punjab 141002" -> {city: "Ludhiana", state: "Punjab"}
  function splitAddress(address) {
    let parts = String(address || "").split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length && /^(india|in)$/i.test(parts[parts.length - 1])) parts = parts.slice(0, -1);
    if (parts.length < 2) return { city: "", state: "" };
    let state = parts[parts.length - 1].replace(/\s*\d{5,6}$/, "").trim();
    state = STATE_ABBREVIATIONS[state.toUpperCase()] || state;
    let city = parts[parts.length - 2].replace(/\s*\d{5,6}$/, "").trim();
    if (/^[\d\s/-]+$/.test(city)) city = "";
    return { city, state };
  }

  // International number for wa.me (null if it can't be a mobile).
  function whatsappNumber(phone, callingCode, countryCode) {
    let d = digits(phone);
    if (!d) return null;
    const cc = String(callingCode || "");
    if (countryCode === "IN") {
      const last10 = d.slice(-10);
      if (last10.length !== 10 || !/^[6-9]/.test(last10)) return null; // landline: no WhatsApp
      return "91" + last10;
    }
    d = d.replace(/^0+/, "");
    if (cc && !d.startsWith(cc)) d = cc + d;
    return d.length >= 8 && d.length <= 15 ? d : null;
  }

  // Bing Maps `data-entity` JSON strings -> one listing per business.
  function parseEntities(rawValues) {
    const out = [], seen = new Set();
    for (const raw of rawValues) {
      let data;
      try { data = JSON.parse(raw || ""); } catch (e) { continue; }
      const e = (data && data.entity) || {};
      const title = String(e.title || "").trim();
      if (!e.id || !title || seen.has(e.id)) continue;
      if (e.entryName && e.entryName !== "Business") continue; // a town/road/landmark
      seen.add(e.id);
      const p = data.routablePoint || {};
      out.push({
        id: e.id, title, address: (e.address || "").trim(), phone: (e.phone || "").trim(),
        website: (e.website || "").trim(), category: (e.primaryCategoryName || "").trim(),
        lat: p.latitude == null ? null : p.latitude, lon: p.longitude == null ? null : p.longitude,
        closed: /permanently closed/i.test(e.openHoursText || "")
      });
    }
    return out;
  }

  function mapsLink(title, address, lat, lon) {
    const q = encodeURIComponent(address ? `${title} , ${address}` : title);
    return lat == null ? `https://www.bing.com/maps?q=${q}` : `https://www.bing.com/maps?cp=${lat}%7E${lon}&lvl=17.0&q=${q}`;
  }

  // A listing found in one search -> lead record.
  function toLead(entity, step, hunt) {
    const place = splitAddress(entity.address);
    let city = place.city || step.city;
    if (city.toLowerCase().startsWith(step.city.toLowerCase())) city = step.city; // "Amritsar I" -> "Amritsar"
    const website = /^[\w.-]+\.[a-z]{2,}/i.test(entity.website.replace(/^https?:\/\//i, "")) ? entity.website : "";
    return {
      key: "bing:" + entity.id,
      name: cleanName(entity.title),
      title: entity.title,
      category: normalizeCategory(entity.category) || normalizeCategory(step.term),
      categoryLabel: entity.category || step.term,
      phone: entity.phone,
      website,
      address: entity.address,
      city, state: place.state || step.state, country: hunt.country, countryCode: hunt.countryCode,
      callingCode: hunt.callingCode,
      lat: entity.lat, lon: entity.lon,
      mapsUrl: mapsLink(entity.title, entity.address, entity.lat, entity.lon),
      hunt: hunt.name, search: `${step.term} in ${step.city}`,
      foundAt: new Date().toISOString(),
      status: "new"          // new -> sent -> replied / interested / won / not_interested
    };
  }

  function score(lead, settings) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const reasons = [];
    const add = (points, reason) => reasons.push({ points, reason });
    if (!lead.website) add(POINTS.no_website, "No website on the map");
    else if (isSocial(lead.website)) add(POINTS.social_only, "Only a social media / listing page");
    else add(0, "Has a website");
    if (lead.city || lead.address) add(POINTS.local_business, "Local business");
    if (lead.phone) add(POINTS.phone, "Phone number listed");
    if (whatsappNumber(lead.phone, lead.callingCode, lead.countryCode)) add(POINTS.whatsapp, "Mobile number (WhatsApp)");
    if ((s.demoLinks || {})[lead.category]) add(POINTS.sample_site, "W3Tech template for this trade");
    const total = Math.max(0, Math.min(100, reasons.reduce((n, r) => n + r.points, 0)));
    return { score: total, reasons, hot: total >= s.hotScore };
  }

  // Keys that identify the same business across searches.
  function dedupeKeys(lead) {
    const keys = [lead.key];
    const phone = digits(lead.phone).slice(-10);
    if (phone.length >= 7) keys.push("p:" + phone);
    const dom = domainOf(lead.website);
    if (dom && !SOCIAL_HOSTS.includes(dom)) keys.push("d:" + dom);
    const name = lead.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (name) keys.push(`n:${name}|${String(lead.city || "").toLowerCase()}`);
    return keys;
  }

  function slugify(text) {
    return String(text || "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  // Personalised preview link for a lead (or the plain link set for its trade).
  function demoLink(lead, settings) {
    const links = (settings && settings.demoLinks) || DEFAULT_DEMO_LINKS;
    let value = String(links[lead.category] || links.other || "").trim();
    // Older setting: a showcase link like …/demos/medical/dentist/ -> its template.
    const old = value.match(/w3tech\.co\.in\/demos\/medical\/([a-z]+)\/?$/);
    if (old) value = old[1];
    if (!TEMPLATES.includes(value)) return value;
    const params = new URLSearchParams({ n: lead.name });
    if (lead.city) params.set("c", lead.city);
    const wa = whatsappNumber(lead.phone, lead.callingCode, lead.countryCode);
    if (wa) params.set("p", wa);
    const slug = slugify(`${lead.name} ${lead.city || ""}`) || "preview";
    return `${PREVIEW_BASE}/for/${value}/${slug}?${params.toString()}`;
  }

  function fillMessage(lead, settings) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const pitch = !lead.website ? "noticed you don't have a website yet."
      : isSocial(lead.website) ? "noticed you only have a social media page, not your own website."
      : "had a look at your website.";
    const inCity = lead.city && !lead.name.toLowerCase().includes(lead.city.toLowerCase()) ? ` in ${lead.city}` : "";
    const values = { name: lead.name, city: lead.city || "", in_city: inCity, pitch, demo_link: demoLink(lead, s),
                     category: lead.categoryLabel || "" };
    return String(s.message || DEFAULT_MESSAGE).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m)).trim();
  }

  function whatsappLink(lead, text) {
    const n = whatsappNumber(lead.phone, lead.callingCode, lead.countryCode);
    return n ? `https://wa.me/${n}${text ? "?text=" + encodeURIComponent(text) : ""}` : null;
  }

  g.W3Core = { DEFAULT_SETTINGS, DEFAULT_MESSAGE, DEFAULT_DEMO_LINKS, TEMPLATES, slugify, POINTS, normalizeCategory, cleanName, domainOf,
    isSocial, splitAddress, whatsappNumber, parseEntities, toLead, score, dedupeKeys, demoLink, fillMessage,
    whatsappLink, digits };
})(typeof self !== "undefined" ? self : this);
