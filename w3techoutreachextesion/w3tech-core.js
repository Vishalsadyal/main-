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
    dailySend: 50,          // WhatsApp messages per day (today's queue)
    sendGapMin: 3,          // seconds before the next chat opens (random between min and max)
    sendGapMax: 6,
    maxPerSearch: 60,
    message: DEFAULT_MESSAGE,
    demoLinks: DEFAULT_DEMO_LINKS,
    sheetUrl: "",           // Apps Script web-app URL (sheets/DemoApi.gs)
    sheetKey: "",           // DEMO_API_KEY
    sheetSync: true,
    // W3Tech leads dashboard(s) that "Push to dashboard" sends to (each only if reachable).
    dashboardSites: ["http://localhost:3000", "https://www.w3tech.co.in"],
    dashboardKey: "",       // LEADS_API_KEY of the site
    price: "",              // your price for a website, used in the pricing message ({price})
    nextMessages: {}        // your own versions of the follow-up messages (Options); empty = defaults
  };

  // Lead status as shown in the panel and written to the Google Sheet.
  const STATUS_LABELS = {
    new: "New", queued: "In today's queue", waiting_reply: "Sent — waiting for reply", sent: "Sent — waiting for reply",
    replied: "Replied", interested: "Designs shown", proposal: "Pricing sent", not_interested: "Not interested", won: "Won",
    skipped: "Skipped", no_whatsapp: "Not on WhatsApp"
  };

  const POINTS = { no_website: 40, social_only: 35, local_business: 10, phone: 5, whatsapp: 5, sample_site: 7,
                   established: 10 };
  const ESTABLISHED = { rating: 4.3, reviews: 25 }; // well rated by enough people

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

  // Name to use in messages and previews: at most `max` characters, cut at a whole word,
  // never ending on a joining word. "Creative Dental Clinic and Implant Centre" -> "Creative Dental Clinic".
  const JOINERS = /^(and|&|of|the|for|in|at|by|with|-|–|\+|,)$/i;
  const FILLER = /^(super|specialit?y|specialty|multi|multi-?speciality|multispecialit?y|multispecialty|best|advanced|premium|top|no\.?\s?1|#1)$/i;
  function shortName(name, max = 30) {
    const clean = cleanName(name).replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    // Filler words go first: "Sushma Memorial Super Specialty Dental Clinic" -> "Sushma Memorial Dental Clinic".
    const trimmed = clean.split(" ").filter((w) => !FILLER.test(w)).join(" ");
    if (trimmed && trimmed.length <= max) return trimmed;
    const words = (trimmed || clean).split(" ");
    const kept = [];
    for (const w of words) {
      if ((kept.join(" ") + " " + w).trim().length > max) break;
      kept.push(w);
    }
    while (kept.length > 1 && JOINERS.test(kept[kept.length - 1])) kept.pop();
    const out = kept.join(" ").replace(/[,&+–-]+$/, "").trim();
    return out || clean.slice(0, max).trim();
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
      const rating = Number(e.ratingValue);
      out.push({
        id: e.id, title, address: (e.address || "").trim(), phone: (e.phone || "").trim(),
        website: (e.website || "").trim(), category: (e.primaryCategoryName || "").trim(),
        lat: p.latitude == null ? null : p.latitude, lon: p.longitude == null ? null : p.longitude,
        closed: /permanently closed/i.test(e.openHoursText || ""),
        rating: rating > 0 && rating <= 5 ? rating : null,
        reviewCount: rating > 0 ? reviewCount(e.ratingCount, data.cardText) : null,
        ratingSource: rating > 0 ? String(e.ratingSourceName || "").slice(0, 40) : ""
      });
    }
    return out;
  }

  // Bing gives the count in `ratingCount`, except for some sources (Zomato) where it is "0"
  // and the real number is only in the card text: "4.6/5 (315 votes)", "4.4/5 (2K Justdial reviews)".
  function reviewCount(ratingCount, cardText) {
    const n = parseInt(String(ratingCount || "").replace(/\D/g, ""), 10);
    if (n > 0) return n;
    const m = String(cardText || "").match(/\/5\s*\((\d[\d,.]*)\s*(K)?\s+(?:votes|[A-Za-z ]*reviews?)\)/i);
    if (!m) return 0;
    const value = parseFloat(m[1].replace(/,/g, ""));
    return Math.round(m[2] ? value * 1000 : value);
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
      rating: entity.rating == null ? null : entity.rating,
      reviewCount: entity.reviewCount || 0,
      ratingSource: entity.ratingSource || "",
      mapsUrl: mapsLink(entity.title, entity.address, entity.lat, entity.lon),
      hunt: hunt.name, search: `${step.term} in ${step.city}`,
      foundAt: new Date().toISOString(),
      status: "new"          // new -> sent -> replied / interested / won / not_interested
    };
  }

  // ---------------------------------------------------------------- competitors

  function distanceKm(a, b) {
    if ([a.lat, a.lon, b.lat, b.lon].some((v) => v == null)) return null;
    const rad = (d) => (d * Math.PI) / 180;
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
    return Math.round(12742 * Math.asin(Math.sqrt(h)) * 10) / 10;
  }

  /** From one search's results (in Bing's order): this business's rank, the top 3 and the 3 nearest others. */
  function competitorsFor(entity, entities) {
    // website: the competitor's own site address (social pages don't count), or "" if none.
    const brief = (e, i) => ({ name: cleanName(e.title), rank: i + 1,
      website: e.website && !isSocial(e.website) ? String(e.website).slice(0, 300) : "",
      rating: e.rating == null ? null : e.rating, reviews: e.reviewCount || 0, ratingSource: e.ratingSource || "",
      km: distanceKm(entity, e) });
    const others = entities.map(brief).filter((c, i) => entities[i].id !== entity.id);
    const nearby = others.filter((c) => c.km != null && c.rank > 3).sort((a, b) => a.km - b.km).slice(0, 3);
    return { rank: entities.findIndex((e) => e.id === entity.id) + 1, top: others.filter((c) => c.rank <= 3), nearby };
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
    // Established business: well rated by enough people. A 4.9★ from 3 reviews doesn't count.
    const established = isEstablished(lead);
    if (established) {
      add(POINTS.established, `Established: ★${lead.rating} from ${lead.reviewCount.toLocaleString("en-IN")}` +
        `${lead.ratingSource ? " " + lead.ratingSource : ""} ${/zomato/i.test(lead.ratingSource) ? "votes" : "reviews"}`);
    }
    const total = Math.max(0, Math.min(100, reasons.reduce((n, r) => n + r.points, 0)));
    return { score: total, reasons, hot: total >= s.hotScore, established, priority: priorityFor(total) };
  }

  function isEstablished(lead) {
    return (lead.rating || 0) >= ESTABLISHED.rating && (lead.reviewCount || 0) >= ESTABLISHED.reviews;
  }

  // Score answers "is this a website-sales opportunity?"; priority ranks the good ones.
  function priorityFor(total) {
    return total >= 70 ? "high" : total >= 60 ? "normal" : "low";
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
    const name = shortName(lead.name);
    const params = new URLSearchParams({ n: name });
    if (lead.city) params.set("c", lead.city);
    const wa = whatsappNumber(lead.phone, lead.callingCode, lead.countryCode);
    if (wa) params.set("p", wa);
    const slug = slugify(`${name} ${lead.city || ""}`) || "preview";
    return `${PREVIEW_BASE}/for/${value}/${slug}?${params.toString()}`;
  }

  // ---------------------------------------------------------------- after they reply (Replied tab)

  // The funnel after the first message, in order.
  const FUNNEL = [
    ["waiting_reply", "Sent"], ["replied", "Replied"], ["interested", "Designs shown"],
    ["proposal", "Pricing sent"], ["won", "Won"]
  ];

  const TEMPLATE_LABELS = {
    dentist: "Dental clinic", medical: "Clinic / hospital", ophthalmology: "Eye care", pediatrics: "Child care",
    gynecology: "Women's health", skincare: "Skin clinic", plasticsurgery: "Cosmetic surgery", dieting: "Diet & nutrition",
    fatloss: "Weight loss"
  };
  // Trades that get every medical design (doctor, nurse, clinic…); others only their own, if any.
  const MEDICAL = ["dental", "clinic", "hospital", "physio", "eye", "child", "women", "skin", "plastic_surgery", "diet"];

  /** Personalised preview links of every design that suits the lead's trade, their own design first. */
  function designLinks(lead, settings) {
    const s = settings || {};
    const own = demoLink(lead, s);
    const ownTemplate = (own.match(/\/for\/([a-z]+)\//) || [])[1];
    const pool = MEDICAL.includes(lead.category) ? TEMPLATES : ownTemplate ? [ownTemplate] : [];
    const ordered = ownTemplate ? [ownTemplate, ...pool.filter((t) => t !== ownTemplate)] : pool;
    return ordered.map((t) => ({ template: t, label: TEMPLATE_LABELS[t] || t,
      url: demoLink(lead, Object.assign({}, s, { demoLinks: { [lead.category]: t } })) }));
  }

  // What to send next. `advance` = the stage the lead moves to once it's sent.
  const NEXT_MESSAGES = {
    more_designs: { label: "Wants to see designs", advance: "interested", text:
      "Thanks for getting back to me, {name}! 😊\n\nHere are a few designs I made with your name on them — tap any to have a look:\n{design_links}\n\n" +
      "Which style do you like best? I can change the colours, photos and text however you like." },
    pricing: { label: "Asks the price", advance: "proposal", text:
      "Hi {name}, happy to share! A complete website like the one you saw — your own name, photos and services, " +
      "mobile-friendly, WhatsApp and call buttons, Google Maps and basic Google search setup — is {price}.\n\n" +
      "That includes the domain setup and one round of changes. Shall we get started?" },
    follow_up: { label: "No answer yet", advance: null, text:
      "Hi {name}, just checking in — did you get a chance to look at the design and the price?\n" +
      "Happy to answer any questions, or we can have a quick 5-minute call. 🙂" },
    not_now: { label: "Not right now", advance: null, text:
      "No problem at all, {name}! I'll keep your design ready. Whenever you're ready, just message me here. 🙂" },
    not_interested: { label: "Not interested", advance: "not_interested", text:
      "Thanks for letting me know, {name}. I won't message again — wishing you all the best! 🙏" },
    onboarding: { label: "Said yes", advance: "won", text:
      "Great, {name}! 🎉 To get started, please send me:\n" +
      "1. Your logo (if you have one)\n2. A few photos of your clinic / work\n3. Your services and timings\n" +
      "4. Address and the phone number to show\n\nI'll share the first version within 2–3 days." }
  };
  // Suggested message for each stage.
  const STAGE_NEXT = { waiting_reply: "more_designs", replied: "more_designs", interested: "pricing", proposal: "follow_up", won: "onboarding" };

  function fillNext(kind, lead, settings, links) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const own = (s.nextMessages || {})[kind];
    const template = own || (NEXT_MESSAGES[kind] || NEXT_MESSAGES.follow_up).text;
    const list = (links || designLinks(lead, s)).map((d) => `• ${d.label}: ${d.url}`).join("\n") || demoLink(lead, s);
    const values = { name: shortName(lead.name), city: lead.city || "", price: s.price || "[your price]",
                     category: String(lead.categoryLabel || "business").toLowerCase(), design_links: list,
                     demo_link: demoLink(lead, s) };
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m)).trim();
  }

  function fillMessage(lead, settings) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const pitch = !lead.website ? "noticed you don't have a website yet."
      : isSocial(lead.website) ? "noticed you only have a social media page, not your own website."
      : "had a look at your website.";
    const name = shortName(lead.name);
    const inCity = lead.city && !name.toLowerCase().includes(lead.city.toLowerCase()) ? ` in ${lead.city}` : "";
    const values = { name, city: lead.city || "", in_city: inCity, pitch, demo_link: demoLink(lead, s),
                     category: lead.categoryLabel || "" };
    return String(s.message || DEFAULT_MESSAGE).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m)).trim();
  }

  function whatsappLink(lead, text) {
    const n = whatsappNumber(lead.phone, lead.callingCode, lead.countryCode);
    return n ? `https://wa.me/${n}${text ? "?text=" + encodeURIComponent(text) : ""}` : null;
  }

  g.W3Core = { competitorsFor, distanceKm, FUNNEL, NEXT_MESSAGES, STAGE_NEXT, TEMPLATE_LABELS, designLinks, fillNext, STATUS_LABELS, shortName, DEFAULT_SETTINGS, DEFAULT_MESSAGE, DEFAULT_DEMO_LINKS, TEMPLATES, slugify, POINTS, ESTABLISHED,
    reviewCount, isEstablished, priorityFor, normalizeCategory, cleanName, domainOf,
    isSocial, splitAddress, whatsappNumber, parseEntities, toLead, score, dedupeKeys, demoLink, fillMessage,
    whatsappLink, digits };
})(typeof self !== "undefined" ? self : this);
