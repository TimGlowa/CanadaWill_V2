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

# README Replacement Section — "Complete Handover Summary"

## Section 1 — Live properties & URLs

* **Frontend (public dashboard):** [https://app.canadawill.ca](https://app.canadawill.ca)
* **Backend ingest app service:** [https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net](https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net)
* **Kudu SCM for ingest:** [https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net](https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net)
* **Legacy/other:**

  * Functions (disabled/abandoned): [https://canadawill-functions2.azurewebsites.net](https://canadawill-functions2.azurewebsites.net)
  * API3 App Service: [https://canadawill-api3-dzeqebevgsb2gxf8.canadacentral-01.azurewebsites.net](https://canadawill-api3-dzeqebevgsb2gxf8.canadacentral-01.azurewebsites.net)

## Section 2 — Azure resources inventory

* Resource group: `CanadaWill-prod2-rg`
* App Services: `canadawill-ingest`, `CanadaWill-web2b`, `CanadaWill-api3`, `CanadaWill-functions2`
* Storage account: not explicitly captured; containers include `articles`, `backups`, `packages`, `azure-webjobs-hosts`, `azure-webjobs-secrets`
* Application Insights: instances created for API3 and Functions, names not logged

## Section 3 — Data providers & quotas

* SERPHouse (active for ingest)
* NewsAPI: 100/day quota (not active in current loop)
* NewsData.io: 200/day quota (fallback; not active in current loop)
* Current scope: ~121 AB MLAs/MPs; Pierre Poilievre added for Battle River–Crowfoot; mayors deferred

## Section 4 — Repo & code layout vs. runtime

* **Repo (CanadaWill_V2):**

  * `/backend` (Phase 2 ingest + Express)
  * `/admin-dashboard` (React admin frontend)
  * `/public-dashboard` (React public frontend)
  * `/docs` (DEVELOPMENT_LOG, NEW_CHAT_LOG, CONSOLIDATION_LOG)
* **Running tree:** confirmed under Kudu `/site/wwwroot` with `express-ingest`, `tools`, `data`, `dist`, etc.
* Drift previously caused by direct Kudu edits; resolved by forcing GitHub → main as source of truth.

## Section 5 — What works vs. what doesn't

* **Works:**

  * Health endpoint `/api/health` returns 200 JSON
  * SERPHouse backfill & refresh working (majors daily 03:00 CT, Poilievre included)
  * CI now green after adding lock files
  * Backend deploy workflow runs on merge to `main`
* **Doesn't:**

  * Weeklies job paused (insufficient coverage)
  * Legacy Azure Functions never stabilized (staticFiles swallowed routes, poisoned deploys)

## Section 6 — Ingest endpoint saga

* 2025-08-17 to 2025-08-23: multiple attempts with Azure Functions v4, all failed due to staticFiles catch-all and missing artifacts.
* Pivoted to Express runtime on App Service.
* Direct KuduLite hotfixes worked but diverged from repo.
* SERPHouse integration verified (Rick Wilson disambiguation fixed with title+province).
* Pierre Poilievre added manually to roster; daily refresh enabled.

## Section 7 — CI/CD realities

* **ci.yml:** builds backend, admin-dashboard, public-dashboard using `npm ci` (lock files added 2025-08-30).
* **deploy.yml:** minimal backend deploy to `canadawill-ingest` using publish profile.
* **auto-merge workflow:** added to auto-enable PR auto-merge (squash).
* Early YAML corruption episodes (hidden `%`) noted in Functions era.
* Auth methods tried: service principal vs publish profile. Settled on publish profile.

## Section 8 — App settings & environment

* Keys in use: `SERPHOUSE_API_TOKEN`, `AZURE_STORAGE_CONNECTION`, `ARTICLES_CONTAINER=articles`, `ROSTER_PATH` (file in backend), `NEWS_API_KEY`, `NEWSDATAIO_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AZURE_MAPS_API_KEY`, `GMAIL_APP_PASSWORD`, `AzureWebJobsStorage`.
* Runtime environment variables: `NODE_ENV`, `PORT`, `WEBSITES_NODE_DEFAULT_VERSION=~20`, `SCM_DO_BUILD_DURING_DEPLOYMENT=true`.

## Section 9 — Verification artifacts

* **Health:** [https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/health](https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/health) → `{status: healthy, timestamp: …}`
* **Tracker files:** under Blob `articles/tracker/majors/<ISO>.json`
* **Logs:** Error `401 Unauthorized` when fetching zip without auth; missing lock file errors fixed after 2025-08-30.

## Section 10 — Problems & why we got stuck

* Azure Functions poisoned by staticFiles route capture.
* Artifact drift when Kudu edits outpaced repo.
* CI failures due to missing package-lock.json.
* Branch protection rules originally forced useless manual approvals.

## Section 11 — How I like to work

* Facts > theories.
* One problem at a time.
* CT timestamps on all log entries.
* No secrets in code.
* Deterministic deploys.
* Explicit success criteria.
* KISS: no extra steps, no redundant approvals.

## Section 12 — F-Series Roadmap (status)

* **F1: Stable HTTP ingest surface (Express)** — **Done**
  Backend now runs as Express App Service (`canadawill-ingest`), health endpoint OK.

* **F2: Provider capture at scale (store raw)** — **Done**
  SERPHouse integrated, majors daily refresh at 03:00 CT, articles stored in Blob `articles/raw/serp/...`.

* **F3: Normalize/dedupe** — **Not yet**
  Current ingest stores raw JSON. No normalization/deduplication layer in place.

* **F4: NLP stance scoring** — **Not yet**
  No scoring models or stance classification built into the pipeline.

* **F5: Aggregations (per-person/topic)** — **Not yet**
  No aggregation outputs or summaries beyond raw/tracker files.

* **F6: Admin/observability** — **Partially**
  Logs visible via GitHub Actions and Azure Log Stream. No dedicated admin panel or observability dashboard yet.

* **F7: Frontend views** — **Partially**
  `public-dashboard` and `admin-dashboard` React apps exist in repo, but deployment not yet wired into CI/CD (only backend deploy live).

* **F8: Backfill & expansion (mayors, other reps)** — **Partially**
  MPs + MLAs covered. Mayors deferred. Pierre Poilievre manually added to roster.

* **F9: Hardening/security** — **Not yet**
  Branch protection simplified; PR auto-merge loop in place. No deeper security hardening applied.

* **F10: Ops runbook & alerts** — **Not yet**
  No formal runbook, alerting, or monitoring configured.

## Section 13 — Canonical references

* Repo: [https://github.com/TimGlowa/CanadaWill_V2](https://github.com/TimGlowa/CanadaWill_V2)
* Actions: [https://github.com/TimGlowa/CanadaWill_V2/actions](https://github.com/TimGlowa/CanadaWill_V2/actions)
* Frontend: [https://app.canadawill.ca](https://app.canadawill.ca)
* Backend: [https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net](https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net)
* Kudu SCM: [https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net](https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net)

## Section 14 — Known dead ends

* Azure Functions v4 with staticFiles.
* Weeklies-only ingest (missed majors).
* CI/CD YAML with hidden `%` corruption.
* Manual Kudu edits without syncing to GitHub.

## Section 15 — Open questions

* Exact storage account name not captured.
* Exact roster file path in backend vs Azure App Settings not logged.
* App Insights instance names not captured.

---

# Development Log Update (CT timestamps)

### 2025-08-29 16:25 CT — Canonical monorepo published; bundle archived

* Repo published to `TimGlowa/CanadaWill_V2` on branch `main`.
* Branch protection enabled (require PR, approvals off).
* Release created with tag `azure-snap-20250824-v2` attaching 26.3 MB bundle.
* CI and deploy workflows established.

### 2025-08-30 07:58 CT — Auto-merge loop + CI lock files

* Auto-merge workflow added; PRs now auto-merge without clicks.
* CI failing initially due to missing lock files.
* Lock files generated (`backend/package-lock.json`, `admin-dashboard/package-lock.json`, `public-dashboard/package-lock.json`) and committed.
* CI green; backend deploy workflow runs from `main`.
* Verified branch protection simplified: PR required, approvals & status checks OFF.

---

# Appendix E — App Settings & Secrets (**SENSITIVE – DO NOT COMMIT**)

*(Values not pasted in full during conversation, but these are the names we tracked. Fill in with exact `name=value` from Azure Portal and GitHub Secrets when completing handover.)*

```
NEWS_API_KEY=...
NEWSDATAIO_API_KEY=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
AZURE_MAPS_API_KEY=...
GMAIL_APP_PASSWORD=...
AzureWebJobsStorage=...
SERPHOUSE_API_TOKEN=...
AZURE_STORAGE_CONNECTION=...
ARTICLES_CONTAINER=articles
ROSTER_PATH=...
```

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