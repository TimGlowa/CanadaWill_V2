# NEW_CHAT_LOG.md

## 23 August 2025 0041 - Complete Handover Summary & Development Log Update

Below are the two deliverables you asked for. I've started with a short "MISSING ARTIFACTS" list (since some items were not provided verbatim), then the handover summary, then the chronologically-timestamped Development Log update (CT).

---

# MISSING ARTIFACTS (needed to fully complete the dossier)

* Current **README.md** and **Development Log** files (full text).
* **CI/CD workflow YAMLs** and any Function **host.json/function.json** content.
* **All App Settings & Secrets (name=value)** exactly as provisioned (you listed the names but not the values).
* **Azure resource group name(s)**, storage account name, and Application Insights instance names.

---

# README — Complete Handover Summary

## Section 1: Live properties & URLs

* **Ingest App (App Service):**

  * App host: `https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net`
  * Health: `/api/health`
  * Build info: `/api/buildinfo`
  * Routes dump: `/api/routes`
* **Kudu/SCM (same app):**

  * Base: `https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net`
  * VFS root: `/api/vfs/site/wwwroot/`
  * Backups folder: `/api/vfs/site/backups/`
* **Backup artifact (known-good):**

  * ZIP: `/api/vfs/site/backups/canadawill-ingest_known-good_20250823-051815Z.zip`
  * SHA256: `/api/vfs/site/backups/canadawill-ingest_known-good_20250823-051815Z.zip.sha256`
* **Frontend app (for citizen lookup):** `https://app.canadawill.ca` (used in screenshots).
* **Represent API (Open North) example used:**
  `https://represent.opennorth.ca/representatives/?point=51.12,-114.2`

## Section 2: Azure resources inventory

* **App Service (Linux, Node):** `canadawill-ingest` (hostnames above).
* **Kudu build stamp:** `Kudu Version : 20250623.5` — `Commit : 353543ec4c45fcbfd4750522d32c94e23b31927a` (seen in Kudu console).
* **Storage:** Active via connection string (name not visible in chat). Container used: **`articles`**.
* **Application Insights:** not provided in the chat.
* **Resource group(s):** not provided.

## Section 3: Data providers & quotas (as observed)

* **SERPHouse:** enabled (token present; value not shown).
* **NewsAPI / NewsDataIO:** endpoints present in codebase; **status endpoint** currently reports providers **disabled** and budgets **configured** as:

  * `newsapi.cap = 80`, `newsdata.cap = 160` (from `/api/news/status`).
* **Roster scope:** **121** Alberta representatives loaded from `data/ab-roster-transformed.json`. Mayors to be added later.

## Section 4: Repo & code layout vs. what's actually running

* **Entrypoint actually serving traffic:** `/home/site/wwwroot/server.js` (shim).

  * Shim behavior (verbatim logic observed): reads `./express-ingest/ingest` and proxies all requests to it; also directly handles `/api/health` and `/api/buildinfo`.
* **Live ingest module in use:** `/home/site/wwwroot/express-ingest/ingest.js` (**not** the copies under `/home/site/wwwroot/deploy_s/...`).
* **Compiled router:** `/home/site/wwwroot/express-ingest/dist/routes/newsRoutes.js` is mounted by `ingest.js` as `app.use('/', newsRoutes)`.
* **Mismatch noted:** Edits under `/home/site/wwwroot/deploy_s/express-ingest/...` did **not** affect the live app; only changes under `/home/site/wwwroot/express-ingest/...` were effective.

## Section 5: What works vs. what doesn't (current)

* **Working (200):**

  * `/api/health` (returns `{ok:true,...}` and boot phase).
  * `/api/buildinfo` (returns build stamp).
  * `/api/routes` (lists mounted endpoints).
  * **SERP tools (live):**

    * `/api/news/serp/env` — confirms `ENABLE_SERPHOUSE=true`, token present, storage configured, `ARTICLES_CONTAINER="articles"`.
    * `/api/news/serp/selftest` — confirms module load: `{ ok:true, found:true, keys:["fetchNews","isEnabled"], defaultIsFn:false }`.
    * `/api/news/serp/backfill?who=danielle-smith&days=365&limit=50` — returns `{ ok:true, raw:[], stored:{...} }` and writes a blob (see Section 9).
    * `/api/news/serp/refresh?who=danielle-smith&days=3&limit=50` — returns `{ ok:true, raw:[] }`.
  * **Verification helpers (added during investigation):**

    * `/api/whoami` — returns `file: "/home/site/wwwroot/express-ingest/ingest.js"`.
    * `/api/serp/ping-hard` — returns `{ ok:true, src:"ingest-hard (live)" }`.
    * `/api/news/serp/ping` — returns `{ ok:true, msg:"serp alive (premount top)" }`.
* **Previously failing (now understood):**

  * SERP routes added only under `/home/site/wwwroot/deploy_s/...` never appeared; requests returned `{"error":"Not found"}`.

## Section 6: Ingest endpoint saga — concise timeline (facts)

* **Phase labels & CT times are captured in the Development Log** below.
* Short version: routes were added repeatedly to the **wrong tree** (`/deploy_s/...`). The actual running file was `/home/site/wwwroot/express-ingest/ingest.js` (loaded by `server.js`). Once minimal routes were injected **into the live ingest.js near the top**, they appeared immediately in `/api/routes`, and worked.

## Section 7: CI/CD realities

* **Deploy mechanism in use during this episode:** **Kudu (ZIP/VFS) + live file edits**.
* **Note:** The chat did not include working GitHub Actions/DevOps workflow names, states, or publish-profile/SPN details. (See "MISSING ARTIFACTS".)

## Section 8: App settings & environment (names observed)

* **From Azure App Settings UI (screenshots):**

  * `WEBSITE_HEALTHCHECK_PATH=/api/health`
  * `WEBSITES_PORT=8080`
  * `WEBSITE_NODE_DEFAULT_VERSION=~20`
  * `WEBSITES_NODE_DEFAULT_VERSION=~20`
  * `WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10`
* **From live env check (`/api/news/serp/env`):**

  * `ENABLE_SERPHOUSE=true`
  * `SERPHOUSE_API_TOKEN` present (value not shown)
  * `AZURE_STORAGE_CONNECTION` present (value not shown)
  * `ARTICLES_CONTAINER=articles`
  * `ROSTER_PATH=data/ab-roster-transformed.json`
* **Other names mentioned by you (values not pasted):**
  `NEWS_API_KEY`, `NEWSDATAIO_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AZURE_MAPS_API_KEY`, `GMAIL_APP_PASSWORD`, `AzureWebJobsStorage`, etc. (Appendix E).

## Section 9: Verification artifacts (canonical tests and signatures)

* **Health (OK):**
  `GET /api/health` → `{"ok":true,"bootPhase":"ingest-loaded","uptimeMs":...,"ts":"2025-08-23T01:09:31.108Z"}`.
* **Build info (OK):**
  `GET /api/buildinfo` → `{ "builtAt":"2025-08-22T03:24:04Z","note":"instrumented+shim" }`.
* **Routes:**
  `GET /api/routes` → shows 5–13 routes; includes `/api/news/serp/*` once live routes were registered.
* **SERP env:**
  `GET /api/news/serp/env` → `{"ENABLE_SERPHOUSE":true,"HAS_TOKEN":true,"ROSTER_PATH":"data/ab-roster-transformed.json","STORAGE":{"hasConn":true,"container":"articles"}}`.
* **SERP selftest:**
  `GET /api/news/serp/selftest` → `{ "ok":true,"found":true,"keys":["fetchNews","isEnabled"], defaultIsFn:false }`.
* **SERP backfill (example):**
  `GET /api/news/serp/backfill?who=danielle-smith&days=365&limit=50` →
  `{"ok":true,"who":"danielle-smith","days":365,"limit":50,"stored":{"stored":true,"container":"articles","key":"raw/serp/danielle-smith/2025-08-23T04-40-06-091Z.json"},"raw":[]}`.
* **Whoami (live file path):**
  `GET /api/whoami` → `{"file":"/home/site/wwwroot/express-ingest/ingest.js","note":"live express-ingest/ingest.js"}`.

## Section 10: Problems & why we got stuck (root cause only)

* **Wrong path edited:** Changes were applied under `/home/site/wwwroot/deploy_s/express-ingest/...`, while traffic was served by `/home/site/wwwroot/express-ingest/ingest.js` via `server.js`.
* **Result:** All SERP routes added under `deploy_s` never mounted; `/api/serp/ping` and related routes returned 404 until routes were registered in the **live** `express-ingest/ingest.js`.

## Section 11: How I like to work (from the session)

* Facts > theories; small, testable steps; **CT timestamps** on every note.
* **Full URLs** only; avoid relative paths.
* Prefer **simple**, avoid "crosswalk" jargon; **mayors later**.
* Keep **known-good backups** (ZIP + checksum).
* When tired, stop; write down the **exact next test**; no hand-wavy plans.
* If using terminals, keep commands minimal and verifiable; otherwise, prefer **two-click** links (Kudu VFS).

## Section 12: F-Series Roadmap (what, not how)

* **F1:** Load and display federal/provincial representatives (baseline).
* **F2:** Address → Representatives via Represent API (household lookup).
* **F3:** Collect news for each official (SERPHouse source).
* **F4:** Sentiment labeling specific to **Alberta separation** stance.
* **F5:** Show stance in `app.canadawill.ca` alongside each official.
* **F6:** Expand roster to include **mayors**.
* **F7:** Storage & retention policy for raw news artifacts.
* **F8:** Admin/reporting views for coverage and gaps.
* **F9:** CI/CD hardening and deterministic deploy/rollback.
* **F10:** Launch checklist, monitoring, and support runbook.

## Section 13: Canonical references

* App: `https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net`
* Kudu: `https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net`
* Backups folder: `/api/vfs/site/backups/`
* Backup ZIP: `/api/vfs/site/backups/canadawill-ingest_known-good_20250823-051815Z.zip`
* Represent example: `https://represent.opennorth.ca/representatives/?point=51.12,-114.2`
* Frontend: `https://app.canadawill.ca`

## Section 14: Known dead ends (do not repeat)

* Editing only under `/home/site/wwwroot/deploy_s/express-ingest/...` (no effect).
* Expecting `newsRoutes.js` tail edits to expose `/api/serp/ping` (router loaded before edits).
* Trying to kill `node server.js` from the Kudu container that wasn't hosting it (no PID match).
* Running `npm ci`/builds in Kudu with Node 18 against packages requiring Node 20 (warnings; not the live path).
* Hunting for "debug center" upload in Kudu VFS UI (not present).

## Section 15: Open questions (from material)

* None explicitly outstanding beyond the F-series scope and committing Kudu edits back to the repo.

### Appendix D — Kudu/portal extracts (selected)

* **Kudu banner:** `Kudu Version : 20250623.5` / `Commit : 353543ec4c45fcbfd4750522d32c94e23b31927a`.
* **App Settings (UI screenshot values):**
  `WEBSITE_HEALTHCHECK_PATH=/api/health`, `WEBSITES_PORT=8080`,
  `WEBSITE_NODE_DEFAULT_VERSION=~20`, `WEBSITES_NODE_DEFAULT_VERSION=~20`,
  `WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10`.

### Appendix E — App Settings & Secrets (SENSITIVE – DO NOT COMMIT)

> Only values explicitly visible in this session are listed with values; others are listed as **MISSING** pending your paste.

* `WEBSITE_HEALTHCHECK_PATH=/api/health`
* `WEBSITES_PORT=8080`
* `WEBSITE_NODE_DEFAULT_VERSION=~20`
* `WEBSITES_NODE_DEFAULT_VERSION=~20`
* `WEBSITE_HEALTHCHECK_MAXPINGFAILURES=10`
* `ENABLE_SERPHOUSE=true` (from env endpoint)
* `SERPHOUSE_API_TOKEN=` **MISSING (present, value not shown)**
* `AZURE_STORAGE_CONNECTION=` **MISSING (present, value not shown)**
* `ARTICLES_CONTAINER=articles`
* `ROSTER_PATH=data/ab-roster-transformed.json`
* `NEWS_API_KEY=` **MISSING**
* `NEWSDATAIO_API_KEY=` **MISSING**
* `OPENAI_API_KEY=` **MISSING**
* `ANTHROPIC_API_KEY=` **MISSING**
* `AZURE_MAPS_API_KEY=` **MISSING**
* `GMAIL_APP_PASSWORD=` **MISSING**
* `AzureWebJobsStorage=` **MISSING**

---

# Development Log — Update (CT timestamps)

> Format: `YYYY-MM-DD HH:MM:SS CT — event`

**2025-08-22 14:20–14:30 CT —** Initial SERPHouse integration built: new endpoints intended (`/api/serp/backfill`, `/api/serp/refresh`, `/api/serp/ping`), client + Azure storage service, new data files. Result after deploy: **routes not visible**.

**2025-08-22 15:00 CT —** Path debugging: changed `express-ingest/app.js` require to `./ingest.js`, removed `require('./dist/routes/newsRoutes').default` line once; **no route changes observed**.

**2025-08-22 15:15 CT —** Instrumented `server.js` with boot logs and route dump; **no [BOOT] logs** appeared in portal at that time.

**2025-08-22 15:45 CT —** Alternative startup attempts (`ingest-simple.js`, `ingest-minimal.js`, `standalone.js`); Azure still using `node server.js`.

**2025-08-22 15:45 CT —** Constraint reaffirmed: do **not** touch `server.js` (historical fragility).

**2025-08-22 16:00 CT —** Verified deployment present via Kudu ZIP; app restarted; still **old route set** only.

**2025-08-22 18:38:18 CT —** Log stream (converted from `2025-08-22T23:38:18.044Z`):
`[ROSTER] Loaded 121 active representatives from data/ab-roster-transformed.json`
`[ingest routes] ['GET /api/health','GET /api/buildinfo','GET /api/routes','GET /api/test']`
`[2025-08-22T23:38:18.044Z] ingest loaded`
`[2025-08-22T23:38:18.049Z] listening on 8080`
**Routes still missing**.

**2025-08-22 19:00:00 CT —** Log stream (converted from `2025-08-23T00:00:00.0409547Z`):
`News provider limits reset for new UTC day`.

**2025-08-22 ~19:04 CT —** Kudu SSH: confirmed write access to `/home/site/wwwroot` and enumerated files. Observed Node `v18.17.1` inside Kudu container; `npm ci` warns packages require Node ≥20; `npm run build` → `npm ERR! Missing script: "build"`. **No impact on live app**.

**2025-08-22 ~23:22:41 CT —** Health shows live boot phase (from `ts":"2025-08-23T04:22:41.364Z"`). Inserted **hard routes into live** `/home/site/wwwroot/express-ingest/ingest.js` (immediately after `const app = express()`):

* `GET /api/whoami` → `{"file":"/home/site/wwwroot/express-ingest/ingest.js"}` (proves live file path).
* `GET /api/serp/ping-hard` → `{"ok":true,"src":"ingest-hard (live)"}`.

**2025-08-22 ~23:22–23:25 CT —** Added **premount subrouter** near top of live `ingest.js`:
`GET /api/news/serp/ping` → `{"ok":true,"msg":"serp alive (premount top)"}`.

**2025-08-22 ~23:38:46 CT —** (from `ts":"2025-08-23T04:38:46.736Z"`) Confirmed:

* `GET /api/news/serp/selftest` → `{ ok:true, found:true, keys:["fetchNews","isEnabled"], defaultIsFn:false }`.
* `GET /api/news/serp/env` → `{"ENABLE_SERPHOUSE":true,"HAS_TOKEN":true,"ROSTER_PATH":"data/ab-roster-transformed.json","STORAGE":{"hasConn":true,"container":"articles"}}`.

**2025-08-22 ~23:40 CT —** SERPHouse endpoints exercised:

* `GET /api/news/serp/backfill?who=danielle-smith&days=365&limit=50` →
  `{"ok":true,"who":"danielle-smith","days":365,"limit":50,"stored":{"stored":true,"container":"articles","key":"raw/serp/danielle-smith/2025-08-23T04-40-06-091Z.json"},"raw":[]}` (blob write confirmed).
* `GET /api/news/serp/refresh?who=danielle-smith&days=3&limit=50` → `{ "ok:true, "raw":[] }`.

**2025-08-23 00:18:15 CT —** Known-good ZIP backup created via Kudu:
`/site/backups/canadawill-ingest_known-good_20250823-051815Z.zip`
Checksum saved as `/site/backups/...zip.sha256`.
Published download links (SCM host VFS).

**Process note (how this was achieved):** Collaboration between Tim and ChatGPT via **Azure Kudu SSH/Console**, with **copy-paste** changes and live verification (`/api/routes`, health, and custom "whoami"/"ping" endpoints). Multiple incremental edits with **immediate CT-timestamped notes**, and a **Kudu VFS ZIP backup** captured post-success.

---

**Big-picture "what's next" reference (per your request, no how-to):**

* **F3/F5** in the roadmap cover the **news scrape rollout** (SERPHouse collection across the roster and surfacing results in `app.canadawill.ca`). This is already partially validated by the working `env`, `selftest`, `backfill`, and `refresh` endpoints above.

If you want me to fold this verbatim into your existing README.md and Development Log files, say the word and I'll draft the exact replacements you can paste into Cursor.

---

## Previous Entries

[Previous entries would go here if they exist] 