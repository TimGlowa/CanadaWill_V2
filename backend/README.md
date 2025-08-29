# CanadaWill — High-Level Plan (SERPHouse-only)

*Last updated: 2025-08-22 (CT)*

## What we're doing now (scope)

* **Goal:** A tiny, reliable **ingest** service that exposes four routes and returns SERPHouse news counts.
* **Only source:** **SERPHouse** (feature-flagged).
* **Non-goals right now:** No frontend builds, no Functions, no NewsAPI/NewsData calls, no scoring pipeline.

## Runtime (prod)

* **Ingest app (Express):**
  `https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net`
* **Expected endpoints (live after a good deploy):**

  * `GET /api/health`
  * `GET /routes`
  * `GET /api/capture?who=danielle-smith&days=7&limit=10`
  * `GET /api/capture/sweep?only=danielle-smith&days=365&limit=100&delayMs=300`

> If `/routes` or `/api/capture*` return 404 after deploy, the wrong payload was shipped or the wrong startup command is set. See "Triaging" below.

## SERPHouse capture (RAW)

**New endpoints for comprehensive Alberta MLA/MP news capture:**

* **`GET /api/serp/backfill`** - 12 months backfill for all Alberta MLAs/MPs
  * Query params: `scope=mlas,mps`, `days=365`, `limit=50`, `only=slug1,slug2` (optional)
  * Stores RAW JSON responses in Azure Blob: `articles/raw/YYYY/MM/DD/<slug>/serphouse_<timestamp>Z_page<P>.json`
  * Creates run summary: `articles/runs/<timestamp>.json`

* **`GET /api/serp/refresh`** - 24-48 hours refresh for new content
  * Query params: `scope=mlas,mps`, `hours=48`, `limit=50`, `only=slug1,slug2` (optional)
  * Same storage structure as backfill
  * Designed for daily/regular updates

**Example calls:**
```bash
# Test single person backfill
GET /api/serp/backfill?only=danielle-smith&days=365&limit=50

# Full roster backfill (MLAs and MPs)
GET /api/serp/backfill?scope=mlas,mps&days=365&limit=50

# Recent refresh for all
GET /api/serp/refresh?scope=mlas,mps&hours=48&limit=50
```

**Storage structure:**
- Raw articles: `articles/<slug>/YYYY/MM/DD/serphouse_<timestamp>Z_page<P>.json`
- Run summaries: `articles/runs/<timestamp>.json`
- Includes full SERPHouse JSON responses, no normalization

**Environment variables:**
- `SERPHOUSE_API_TOKEN` - Your SERPHouse API key
- `SERP_MAX_CONCURRENCY=6` - Max concurrent searches (default)
- `SERP_DELAY_MS=300` - Delay between requests (default)
- `SERP_PAGE_MAX=3` - Max pages per search (default)
- `SERP_INCLUDE_DOMAINS_FILE=data/ab-weeklies.json` - Alberta weekly newspapers

## Environment (ingest app)

Required (no secrets here):

* `ENABLE_SERPHOUSE=true`
* `SERPHOUSE_API_TOKEN=<value set in Azure>`
* `AZURE_STORAGE_CONNECTION=<value set in Azure>` (OK to have even if we're not writing yet)
* `ARTICLES_CONTAINER=articles`
* `PORT=8080`, `WEBSITES_PORT=8080`, `NODE_ENV=production`

Present but **not used** for this phase (fine to keep): `REPRESENT_API_BASE_URL`, `ROSTER_PATH`, any OpenAI/Anthropic/maps/email keys.
Legacy NewsAPI/NewsData keys are **not** required (we removed them; only mention if legacy code paths exist).

## CI/CD (single pipeline only)

* **Active workflow:** `.github/workflows/ingest-webapp-deploy.yml`
* **What it must deploy:** **only** `express-ingest/` (with `app.js`, `package.json`, and needed runtime files).
* **What it must not do:** build `public-dashboard/`, compile other packages, or run repo-root steps.

Trigger with a small change under `express-ingest/**` or an empty commit. After deploy, validate the four endpoints above.

## Acceptance (stop here when all pass)

1. `GET /api/health` → 200 with JSON.
2. `GET /routes` → lists exactly:

   * `GET /api/health`
   * `GET /routes`
   * `GET /api/capture`
   * `GET /api/capture/sweep`
3. `GET /api/capture?who=danielle-smith&days=7&limit=10` → JSON with `result.found > 0` **when** `ENABLE_SERPHOUSE=true` and token is present.
4. `GET /api/capture/sweep?...` → streams plain text progress lines.

## Why routes have been missing

* A non-ingest workflow kept running repo-root steps and tried to build the **frontend**.
* That produced a failing job and/or a payload that didn't contain the tiny server. Health kept working from an older artifact; **routes did not**.

## Triaging (fast)

1. **Workflow check (GitHub → Actions):**

   * Only **one** enabled workflow: `ingest-webapp-deploy.yml`.
   * The run should show it's operating under `express-ingest/` (no `public-dashboard` logs).
2. **Payload check (Kudu on ingest app):**

   * `https://canadawill-ingest-...scm.../DebugConsole`
   * `/site/wwwroot` contains `app.js` and `package.json` from **express-ingest**.
3. **Startup command (Azure Portal → App Service → General settings):**

   * **Startup Command:** `node app.js`
4. **Post-deploy smoke:**

   * Open the four URLs above in a browser.
   * If `/routes` is **not** present, the wrong thing is running.

## Troubleshooting — "New routes don't show up after deploy"

**TL;DR:** The site runs `/home/site/wwwroot/express-ingest/ingest.js` via `server.js`. Do not edit anything under `/home/site/wwwroot/deploy_s/...`.

**Quick checks:**
- **Health:** `…azurewebsites.net/api/health` → must include `"bootPhase":"ingest-loaded"`.
- **Build info:** `…azurewebsites.net/api/buildinfo` → JSON.
- **Routes:** `…azurewebsites.net/api/routes` → lists mounted endpoints.

**Prove the executing file:**
Add (temporarily) near the top of `express-ingest/ingest.js`:
```javascript
app.get('/api/whoami', (_req,res)=>res.json({ file: __filename }));
```
Visit `…/api/whoami` — that path is the file the app is actually running.

**Mount new features safely:**
Require a small helper from the live ingest:
```javascript
try { 
  require('./serp-tools.runtime')(app); 
} catch(e) { 
  console.error('[SERP tools] require failed', e); 
}
```
Keep the helper idempotent and free of secrets.

**Remember:**
Edits in `/home/site/wwwroot` persist across restarts but will be overwritten on the next deployment. Commit changes to the repo and keep CI/CD aligned.

## Guardrails (KISS)

* Don't edit or build the frontend for this phase.
* Don't include root or monorepo builds in the ingest pipeline.
* Keep the 404 handler last in `app.js`.
* Document every change in `DEVELOPMENT_LOG.md` with **CT** timestamps.

## F-Series (big picture; what, not how)

* **F1:** Green server + diagnostics (`/api/health`, `/routes`).
* **F2:** SERPHouse capture returns `found > 0` for Danielle Smith; optional blob write.
* **F3:** Simple sweep (streaming) with safe defaults (365d/100/300ms).
* **F4:** 60-day backfill; daily delta.
* **F5:** Normalize + dedupe.
* **F6:** Durable blob schema.
* **F7:** Read/search endpoints for the dashboard.
* **F8:** Scheduled sweeps with quotas.
* **F9:** App Insights dashboards + alerts.
* **F10:** Export/audit with provenance.

---

## Known-Good Snapshot — 2025-08-22 (UTC)

**What's working**
- Node runtime: ~20 (App Service image `appsvc/node:20` confirmed in logs)
- Entrypoint: Oryx startup (`node server.js`), instrumented server with `/api/health` and `/api/buildinfo`
- Ingest: loads after production deps installed (`express-ingest` + `axios`)
- App Service health check: `/api/health` (WEBSITE_HEALTHCHECK_PATH), HTTP logging enabled

**Deployment safety**
- `SCM_DO_BUILD_DURING_DEPLOYMENT=1` to ensure Oryx runs `npm install` at root and triggers the root `postinstall`
- Root `postinstall` runs `npm ci --omit=dev` in `express-ingest/` to guarantee runtime deps
- Node version pinned via App Settings (`WEBSITE_NODE_DEFAULT_VERSION=~20`) and/or `engines` in package.json

**Known-good backup (Kudu)**
- Created under `/home/site/backups/` as `canadawill-ingest_known-good_YYYYMMDD-HHMMSSZ.zip`
- Zip includes full `wwwroot` and a `BACKUP_README.md` with quick restore steps

**Quick restore (Kudu SSH)**
```bash
set -e
cd /home/site
mv wwwroot wwwroot.old-$(date -u +%Y%m%d-%H%M%SZ)
unzip -q backups/canadawill-ingest_known-good_YYYYMMDD-HHMMSSZ.zip -d /home/site
touch wwwroot/restartTrigger.txt
```

---

## Known-Good Snapshot — 2025-08-22 13:24:35Z (08:24:35 CT)

**Backup file (on App Service)**
- /home/site/backups/canadawill-ingest_known-good_20250822-132435Z.zip

**Direct download**
- https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net/api/vfs/site/backups/canadawill-ingest_known-good_20250822-132435Z.zip

**Quick restore (Portal → Development Tools → Console)**
```bash
set -e; cd /home/site; mv wwwroot "wwwroot.old-20250822-132435Z"; unzip -q "backups/canadawill-ingode_known-good_20250822-132435Z.zip" -d /home/site; touch wwwroot/restartTrigger.txt
```

---

## Operations: Kudu hotfix workflow

**Live code path**: `/home/site/wwwroot/express-ingest/ingest.js`

**If routes don't show**:
- Hit `/api/whoami` to confirm which file is serving
- Use `/api/routes` to enumerate mounted routes

**Hotfix workflow**:
- Use Kudu only for emergencies
- Always mirror fixes to GitHub after
- Take a backup ZIP from Kudu after every successful change

**Working style:** facts over theories, one problem at a time, server-first validation, CT timestamps, no secrets in code, deterministic deploys with clear DONE checks.

---

## Milestone: Alberta MLAs/MPs News Ingest (2025-08-24)

**Status:** ✅ Stable ingest for Alberta MLAs & MPs (12-month backfill complete).  
**Auto-refresh:** ✅ Daily at ~03:00 Central (majors; no domain filter).  
**Weeklies:** ⏸ Paused for now (kept for later as an *additional* source, not a filter).  
**Storage:** Azure Blob → `articles/raw/serp/<slug>/<ISO>.json` (+ `articles/tracker/majors/<ISO>.json`).  
**Vendor:** SERPHouse `/serp/live` (serp_type=news).  
**Scope/Topics:** Alberta separation/independence/referendum, "Alberta Prosperity Project / APP", "Forever Canada/Forever Canadian".

### What works now (KISS)

- **12-month backfill** completed for ~121 Alberta MLAs/MPs using `express-ingest/data/ab-roster-transformed.json`.
- **Daily refresh** job runs ~**03:00 Central** (UTC schedule in `App_Data/jobs/triggered/majors-daily/`).
- **Query disambiguation** to avoid "same-name" noise (e.g., "Rick Wilson" U.S. strategist):
  - Built queries include **full name + role + Alberta context** (e.g., `"Rick Wilson" MLA Alberta`).
- **Blob writes per person** under `articles/raw/serp/<slug>/...` and a **run tracker** JSON with counts.
- **Diagnostics kept**:
  - `GET /api/news/serp/vendor-probe` → vendor status + detected result keys + sample titles.
  - `GET /api/routes` → confirms actual mounted routes.

### Key fixes (and what we tried)

1) **Routes shadowing**  
   - Problem: a stub `/api/news/serp/backfill` and a **ping-only subrouter** mounted at `/api/news/serp` were intercepting real handlers → **404/Not found (fallback)** and "stubs".  
   - Fix: renamed the stub to `/api/news/serp/backfill_stub` and moved ping to `/api/serp-ping`. Real backfill/refresh now attach cleanly.

2) **Vendor shape drift**  
   - Observation: SERPHouse sometimes returns `payload.results.news`, other times `payload.results.results.news`.  
   - Fix: parsing is **tolerant**; we unwrap either shape and default to `[]` safely.

3) **Name collisions (irrelevant articles)**  
   - Example: "Rick Wilson" pulled U.S. political results.  
   - Fix: add role/geo anchors (MP/MLA/Mayor, Alberta/Canada) into the query builder. We **deleted** the bad Rick Wilson blobs and re-ran a clean backfill.

4) **Weeklies domain list bias**  
   - Attempt: restrict to a curated list of ~60–80 Alberta weeklies only.  
   - Result: near-zero results, because majors and broad aggregators were excluded.  
   - Decision: **pause** the weeklies job. Keep majors **unrestricted** for coverage. Later, run weeklies as an **additional** (weekly) pass, not a filter.

5) **Q override**  
   - Both backfill/refresh accept `&q="..."` to debug with a precise query when needed.

### Endpoints (Express)

- **Backfill (12 months default)**
  `GET /api/news/serp/backfill?who=<slug>&days=365&limit=50&store=1`

- **Refresh (3 days default)**
  `GET /api/news/serp/refresh?who=<slug>&days=3&limit=50&store=1`

- **Optional on both**: `&q=` to override the built query.
- **Diagnostics**:
  - `/api/news/serp/vendor-probe`
  - `/api/routes`

### Storage layout (Azure Blob)

```
articles/
├── raw/
│   └── serp/
│       └── <slug>/
│           └── 2025-08-24T03-01-22-123Z.json # vendor payload for that person & run
└── tracker/
    └── majors/
        └── 2025-08-24T03-01-22-123Z.json # run summary (counts per person)
```

### Roster

- **File**: `express-ingest/data/ab-roster-transformed.json` (121 officials)
- **Each record**: `{ "slug", "fullName", "office", "aliases": [] }`
- **Pierre Poilievre (BRC by-election)** was added; replaced the old BRC MP; 12-month backfill done and on the daily refresh.

### KISS runbook

- **Verify a run**: check a tracker blob under `articles/tracker/majors/...`
- **Inspect a person**: open their latest blob under `articles/raw/serp/<slug>/...`
- **Sanity**: `GET /api/routes` and `GET /api/news/serp/vendor-probe`

### Version-control hygiene (lesson learned)

We used **Kudu** for rapid hotfixes. That unblocked us fast, but it **diverged** the live app from Cursor/GitHub.  
**Policy going forward:**
- Emergency fixes may use Kudu, **but**:
  1. Immediately create a **git bundle** from Azure (we did: `/home/site/backups/wwwroot-20250824T133742Z.bundle`).
  2. **Pull that bundle locally** (via Cursor) and compare with your repo before pushing.
  3. Merge via PR back to main; avoid long-running drift.

This README reflects the fixed, working behavior. The Azure bundle is the source of truth for this milestone; reconcile the repo to match.

### Next

- Add **mayors** dataset (same shape) and schedule a **weekly** weeklies-only pass (e.g., Fri 05:00 CT) as an addition, not a filter.  
- Sentiment/analysis over stored blobs, with a first-pass agent that verifies **Alberta-politics relevance** before scoring.

---

## Azure Kudu Bundle Backup Reference

**Backup file**: `wwwroot-20250824T133742Z.bundle`  
**Location**: `/home/site/backups/wwwroot-20250824T133742Z.bundle` on Azure  
**Purpose**: Source of truth for this milestone; contains all working code and configuration

**Download and clone locally**:
```bash
# Download from Kudu VFS
curl -fSL -u "KUDU_USER:KUDU_PASS" \
  "https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net/api/vfs/site/backups/wwwroot-20250824T133742Z.bundle" \
  -o "wwwroot-20250824T133742Z.bundle"

# Clone locally
git clone "wwwroot-20250824T133742Z.bundle" "../canadawill-azure-snap-20250824"
```

This leaves you with a local working copy at `canadawill-azure-snap-20250824` (no remote yet). We'll do the GitHub reconciliation in a separate step when you're ready. 