# Consolidation Log — CanadaWill2

## 29 August 2025 — Creation of CanadaWill2 Monorepo

### Why
- Previous workflow suffered from drift between Azure runtime (Kudu hotfixes) and GitHub repos.
- Backend (Phase 2 ingest) lived in its own tree, while frontend dashboards (admin + public) lived separately.
- Needed one **canonical repository** as the single source of truth.

### What We Did
- Created new root folder `CanadaWill2/`
- Moved **Phase 2 ingest/backend** → `backend/`
- Moved **admin-dashboard** React frontend → `admin-dashboard/`
- Moved **public-dashboard** React frontend → `public-dashboard/`
- Created root `README.md` describing structure and artifacts
- Created `/docs/` directory for logs and history

### Artifacts Captured
- `wwwroot-20250824.zip` — older runtime snapshot (stale)
- `wwwroot-20250829.zip` — runtime snapshot pulled 29 Aug 2025
- `wwwroot-20250824T133742Z.bundle` — 26.3 MB golden restore, to be attached as GitHub Release asset

### Next Steps
- Publish `CanadaWill2/` to GitHub (`TimGlowa/CanadaWill2`)
- Attach bundle to Release (`azure-snap-20250824`)
- Protect `main` branch (require PRs)
- Freeze rule: GitHub = truth, Azure = runtime only (no Kudu edits)

## 29 August 2025 — Release attached in new canonical repo

- Repo: https://github.com/TimGlowa/CanadaWill_V2 (branch: main)
- Branch protection: enabled (Require PR before merge)
- Release created with tag **azure-snap-20250824-v2**
- Asset: **wwwroot-20250824T133742Z.bundle** (26.3 MB) attached as golden restore
- Purpose: preserve Azure App Service runtime history from 24 Aug 2025 without committing bundles into the tree
- Rule confirmed: GitHub = source of truth; Azure = runtime only (no Kudu edits)

## 29 August 2025 — Branching model finalized

- Main branch protected as canonical "trunk"
- All future work happens in feature branches (side branches)
- PR + Merge required to integrate changes into main
- This ensures GitHub remains the single source of truth
- Azure is runtime-only; no edits are permitted there
