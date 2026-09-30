# W3Tech Sales Engine — Status

*Last updated: 30 Sep 2026 · Spec: `docs/# W3TECH AUTOMATED WEBSITE LEAD & DEMO S.txt`*

Find leads → analyse → score → personalised demo → outreach → track → convert.

| | |
|---|---|
| **Dashboard (Python)** | `D:\Vishal\w3tech_lead_engine` (own git repo) · run `.\.venv\Scripts\python.exe run.py` → http://127.0.0.1:5000 |
| **Website (Next.js)** | `D:\Vishal\w3tech` · branch `feat/location-pages-nav-and-tools` (pushed) · `npm run dev` → http://localhost:3000 |
| **Live demo database** | Google Sheet "W3TECH SALES SHEET" (tabs *Demos*, *Events*) + Apps Script web app `sheets/DemoApi.gs` |
| **Tests** | 162 passing (`.venv\Scripts\python.exe -m pytest -q`) |

---

## 1. Done

### Phase 1 — Foundation ✅
- Flask app factory, SQLite, SQLAlchemy models (Lead, WebsiteAnalysis, Demo, DemoEvent, Campaign, CampaignLead, Message, Settings, LeadActivity, LeadSearch, PlaceCache, ApiUsage).
- Additive migration: new columns are added to the existing database automatically on start.
- Dashboard, lead CRUD, lead workspace page with timeline, notes, status pipeline.
- Security: CSRF on all forms, JSON-only API, optional `API_TOKEN` bearer auth, secrets redacted from logs.

### Phase 2 — Leads ✅ (analyzer partly)
- **Leads CRM** (`/leads`): stat cards, filters (category, city, state, status, temperature, website status, demo, score), table with website column, bulk actions (status, generate demo, re-score, enrich, export, delete).
- **Lead finder**: Geoapify (places + location autocomplete), Google Places (legacy API, 200 calls/day cap, cached), mock provider. Search results funnel with tabs; import selected.
- **Imports**: CSV (incl. Maps-Leads-Finder export — every column mapped, emails, lat/lon, socials, rating), pasted lists (`Name | Category | Phone | …`), update-existing toggle.
- **Dedupe**: name + city, phone (last 10 digits), domain; shared hosts (Instagram, Facebook, wa.me, Practo…) matched by profile path; branches merged with notes.
- **Cleaning**: categories normalised ("Dentist" → dental); styled Unicode names (𝗗𝗿. 𝗪𝗮𝗹𝗶𝗮) converted to plain text; SEO filler stripped for demo names.
- **Scoring**: transparent points with reasons (no website 40, social only 35, broken 35, … good website −30); hot/warm thresholds in Settings.
- **Google enrichment**: "Fill from Google" per lead or in bulk (rating, reviews, phone, website).
- **Chrome extension "W3Tech Lead Clipper"** (`extension/`): sends the Maps page URL to the dashboard, which fetches the data through the official API (no scraping).

### Phase 3 — Demos & tracking ✅
- **Template engine** (sandboxed Jinja) with the **dental** template (from the ClinicMaster theme).
- **Demo generator**: personalised from lead data only (no fake reviews, doctors or awards), demo builder with live preview (desktop/mobile), regenerate, archive, delete.
- **Demo URLs**: name + location slugs (`/demo/jolly-dental-care-ludhiana`) and 6-character demo IDs (`/demo/CKCMD8`).
- **Live on w3tech.co.in**: "Publish live" writes the demo (all data + finished page) to the Google Sheet; the website serves `/demo/<slug>` from the Sheet — no deploy per demo. Update, take offline, bulk publish.
- **Tracking**: opens, button clicks (call, WhatsApp, email, CTAs), sections seen, scroll depth, time on page, plus visitor IP, approximate city/region/country, device, browser, referrer. Stored in the Sheet's *Events* tab; the dashboard syncs automatically every ~2 min.
- **Visitor insights** on each demo and lead: interest level (🔥 Hot / Warm / Opened / Not opened), visitors table, timeline entries ("Opened the live demo 2 times — Patiala · mobile"), "This is me" to ignore your own IP.

### Phase 4 — Outreach ✅ (partly — see pending)
- **Tasks page** (`/tasks`, sidebar badge): the next step for every lead, most urgent first — Reply now (demo clicked / replied), Send pricing, Follow up (after open, 3 days, max 2, then "close?"), Follow up on pricing, Send demo link, Publish demo, Generate demo.
- Ready-made messages (demo, follow-up, pricing, reply — editable in Settings); **Open WhatsApp** fills the chat, you press send; **Mark as sent** logs the message and moves the lead on. Snooze, They replied, Interested, Not interested, Won, Lost.

### Website (`D:\Vishal\w3tech`)
- `/demos/medical` gallery with 9 medical template variants, each with its own assets (81 missing ClinicMaster files recovered).
- `src/app/demo/[slug]/route.ts` — serves live demos from the Sheet (cached 60 s, `noindex`, status header `X-Demo-Status` for troubleshooting).
- `src/app/api/demo-track/route.ts` — records events with IP, Vercel geo headers and device.
- `public/demo-assets/dental/` — shared assets for live dental demos.

---

## 2. Changed from the original spec

| Spec said | What we did | Why |
|---|---|---|
| Demo pages hosted by the Python app | Demos published to a **Google Sheet** and served by the Next.js site at `w3tech.co.in/demo/...` | New demos go live instantly with no deploy; the Sheet can hold extra data |
| Demo link carries the data | Link carries only **name + location** (+ short ID); data lives in the Sheet | Short, clean links |
| Lead finder scrapes / external provider | **Official APIs only** (Geoapify, Google Places) + your own CSV/pasted data + Clipper extension that sends only the URL | No scraping of Google Maps; you source leads yourself |
| Tracking "where technically/legally supported", no personal data | Tracking now **stores IP, approximate location and device** (on request) | To see whether and how each lead engaged — handle under India's DPDP Act |
| Campaigns + automatic sending (mock email/WhatsApp) | **Tasks page with manual WhatsApp sending** (message prepared, you press send) | Manual review, no spam; works today without the WhatsApp Business API |
| Separate Messages / Analytics screens | Messages logged per lead and on Tasks; insights on demo and lead pages | Screens still show "coming in a later phase" |
| Many templates | **Dental only** wired into the engine; 9 medical variants exist as static showcases on the website | Converted one first to prove the pipeline |

---

## 3. Pending

### Setup to finish (you)
- [x] **Vercel → `DEMO_SHEETS_URL`** — done; `https://www.w3tech.co.in/demo/WNXW4V` returns 200 (`X-Demo-Status: ok`) as of 30 Sep 2026.
- [ ] **Apps Script:** paste the latest `sheets/DemoApi.gs` → Deploy → Manage deployments → ✏️ → New version. The Events tab still has the old 5 columns, so IP / location / device / sections / scroll / time are not being saved yet.
- [ ] **Merge the website branch** `feat/location-pages-nav-and-tools` into the branch Vercel uses for production, if that isn't this branch.
- [ ] Review the **pricing / follow-up / reply texts** in Settings (pricing uses {price} = average project value, ₹25,000).
- [ ] Rotate the Groq API key (it was exposed earlier).

### Features not built yet
- [ ] **Quick filters on Leads**: has website, has WhatsApp, no website, low rating, high rating, 🔥 high rating but no website.
- [ ] **Website analyzer** (spec §10): automatic check of mobile, speed, design, CTA, WhatsApp button — today website status is set by import or manually.
- [ ] **More demo templates**: wire the other 8 medical variants and other categories (salon, gym, restaurant…) into the engine.
- [ ] **Messages & Analytics screens** (still placeholders): send history, conversion reports.
- [ ] **AI copy** (spec §17): personalised messages / demo text with an AI provider.
- [ ] **Campaigns** (spec §21): batch outreach with approval queue.
- [ ] **Real sending** (Phase 5): WhatsApp Business API, SMTP email — currently manual WhatsApp only.
- [ ] **Production hardening** (Phase 6): login for the dashboard, rate limiting on the tracking endpoint, database backups, deployment config.
- [ ] Clean up the old test demo views (10 opens on the Walia demo from testing, recorded before IPs were stored).


REPLAY : 

This is a **strongly progressed MVP**. Based on this status, I would **not rebuild the system**. The core funnel is already working:

**Lead → qualification → demo → live URL → tracking → manual outreach → follow-up**

The next work should focus on making that funnel reliable and useful for actually getting website clients.

### What I would do next

**1. Finish production setup first**

* Set `DEMO_SHEETS_URL` in Vercel.
* Redeploy.
* Update the Apps Script deployment.
* Merge the production website branch.
* Rotate the exposed Groq key.
* Test 3–5 real demo URLs from an external device/network.

Until this is done, the live-demo pipeline isn't fully production-ready.

**2. Build the website analyzer next**
This is probably the biggest missing piece in your original idea.

For each lead, automatically determine:

| Check        | Example result    |
| ------------ | ----------------- |
| Website      | Exists / Missing  |
| Mobile       | Good / Poor       |
| HTTPS        | Yes / No          |
| Load time    | 2.8s              |
| CTA          | Present / Missing |
| WhatsApp     | Present / Missing |
| Contact info | Present / Missing |
| Design       | Basic / Modern    |
| Broken links | 0 / 3             |
| SEO basics   | Pass / Issues     |

Then your existing score becomes much more meaningful.

For example:

> **🔥 82/100 — High-priority lead**
> No website +40
> Google rating 4.6 + strong business signal
> No WhatsApp CTA +5
> Poor mobile experience +25
> **Reason:** established business with strong customer interest but weak online presence.

That gives you a **reason to contact them**, rather than simply collecting businesses.

**3. Add the quick filters**
These are small but very valuable:

* 🔥 High rating + no website
* No website
* Website exists
* Has WhatsApp
* No WhatsApp
* Rating ≥ 4.5
* Rating ≥ 4.0
* Poor website
* Demo generated
* Demo opened
* Demo clicked
* Replied
* Interested

Then your daily workflow can literally be:

**Leads → 🔥 High rating + No website → Generate demos → Publish → Tasks → Contact**

**4. Don't build automatic WhatsApp sending yet**

Your current:

> Prepare message → Open WhatsApp → You press Send → Mark as sent

is actually a good MVP.

First prove that **100 qualified leads can produce conversations and website projects**. Then integrate the official WhatsApp Business API.

The important metric isn't "messages sent."

It's:

**100 leads → demos → opens → replies → interested → proposals → paid projects**

### One thing I would change in your tracking

You're currently collecting IP + approximate location + device information.

For a sales system, I'd keep the tracking **as minimal as necessary** and make sure your privacy notice/consent and retention approach are appropriate for your actual deployment. Don't collect more visitor information simply because it's technically available.

### Your immediate roadmap

I'd make the next phases:

**Phase 4A — Production**

> Vercel + Apps Script + live demo verification

**Phase 4B — Qualification**

> Website analyzer + quick filters + better scoring

**Phase 4C — Sales**

> Tasks → outreach → follow-ups → replies → proposals → Won

**Phase 4D — Templates**

> Dental → salon → gym → restaurant → other local businesses

**Phase 4E — Analytics**

> Lead → demo → open → click → reply → sale conversion funnel

**Phase 5 — Automation**

> AI personalization + approval queue + official WhatsApp/Email APIs

**Phase 6 — Hardening**

> Login, rate limiting, backups, audit logs, deployment configuration

### The biggest strategic point

You already have something more useful than a generic "lead scraper."

Your product is becoming:

> **Find businesses with an online presence problem → prove the problem → create their website before they ask → show them their personalized site → contact them → track interest → close the website project.**

That's the workflow I'd optimize now.

And because your **W3Tech website, Python dashboard, Google Sheet demo backend, Next.js live demos, tracking, and CRM are already connected**, I would spend the next development effort on **qualification + conversion**, not adding lots of unrelated SaaS features.

