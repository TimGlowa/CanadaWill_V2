# CanadaWill2 Monorepo

This repository is the **canonical source of truth** for the CanadaWill platform as of **29 August 2025**.  
It consolidates backend ingest services and both frontend dashboards into one repository.

## Structure

```
CanadaWill2/
├── README.md            # This file (repo overview)
├── docs/                # Development logs and historical notes
│   ├── DEVELOPMENT_LOG.md
│   ├── NEW_CHAT_LOG.md
│   └── README.md
├── backend/             # Phase 2 ingest + API services
├── admin-dashboard/     # React/TypeScript admin interface
└── public-dashboard/    # React/TypeScript public dashboard
```

### Backend
- Located under `/backend/`
- Contains the Phase 2 ingest service, Express APIs, and Azure Functions
- Includes integration with SERPHouse and other providers

### Frontend
- `/admin-dashboard/`: React/Vite admin portal
- `/public-dashboard/`: React/Vite public-facing dashboard (powers [app.canadawill.ca](https://app.canadawill.ca))

### Documentation
- Located under `/docs/`
- **`DEVELOPMENT_LOG.md`**: Chronological engineering log (with CT timestamps)
- **`NEW_CHAT_LOG.md`**: AI-assisted session transcripts and notes
- **`README.md`** inside `/docs` acts as an index

## Backup Artifacts

These snapshots and bundles were created during the transition:

- `wwwroot-20250824.zip` → Stale snapshot (Aug 24)  
- `wwwroot-20250829.zip` → Runtime snapshot (Aug 29)  
- `wwwroot-20250824T133742Z.bundle` → Golden restore (26.3 MB).  
  This `.bundle` is attached as a **GitHub Release asset** (not committed into the repo tree).

## Workflow Rules

- **GitHub = canonical source**  
- **Azure = runtime only** (no direct Kudu edits)  
- All edits flow: Cursor → branch → PR → merge → deploy  

## Next Steps

1. Attach the `.bundle` as a release (`azure-snap-20250824`)  
2. Protect `main` branch (require PRs)  
3. Conduct periodic drift checks vs Azure runtime
