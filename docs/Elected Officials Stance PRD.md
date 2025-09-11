# Elected Officials Stance PRD
### Version 4.0 - September 5, 2025

## 1. Executive Summary

This PRD defines an automated sentiment analysis pipeline to determine Alberta MLAs' and MPs' stances on Alberta's relationship with Canada. The system emphasizes speed to market, full coverage, and credibility through a three-phase approach: automated backfill for all 121 officials, manual verification of known separatists, and ongoing automated updates.

**Updated 5 September 2025**: Added comprehensive workflow, task breakdown, and execution sequence with concrete subtasks and verification steps.

## 2. Core Objective

**Determine where each of Alberta's 121 elected officials stands on the spectrum from "Strong Canadian Federalist" to "Strong Alberta Separatist" based on their public statements in news media, with full automated coverage and manual verification for critical cases.**

## 3. Execution Sequence

### Phase 1 – Automated Backfill (Immediate Priority)
**Purpose**: Deliver full coverage across all 121 MLAs and MPs right away using the automation already built.

1. **Re-run SERPHouse ingestion**
   - Use updated query template: `"<FullName>" "<Office>" AND (separation + unity keywords)`
   - Backfill 12 months of results
   - Store under `articles/raw/serp/....`

2. **Run snippet filter**
   - Scan title + snippet for separation/unity cues
   - Save flagged metadata to `articles/flagged/....`
   - Queue URLs for scraping

3. **Scrape full text**
   - Fetch once per URL
   - If accessible → save cleaned text to `articles/full/....`
   - If blocked → mark paywalled

4. **Process through Agents 1–3**
   - Agent 1: Relevance (Alberta–Canada stance)
   - Agent 2: Stance scoring (0–100, evidence, confidence)
   - Agent 3: Verification and comparison
   - Save stance outputs under `articles/stance/....`

5. **Build stance index**
   - Generate `stances/index.json` with latest stance per official
   - Maintain longitudinal record in `stances/history/....`

6. **Integrate with app**
   - Connect frontend to `stances/index.json`
   - Show classification (color-coded), confidence, ≤50-word evidence, and article link
   - Add "Contact" button (mailto) for unknowns

### Phase 2 – Manual Additions (After Launch)
**Purpose**: Strengthen credibility by ensuring the ~10–11 known separatists are explicitly flagged, even if automation missed nuance.

- Manually review coverage for those officials
- Update their stance entries in `stances/index.json` with higher confidence and clear evidence

### Phase 3 – Ongoing Updates (Steady State)
**Purpose**: Keep stance data fresh and credible.

- Run SERPHouse ingestion and full pipeline 1–2 times per week
- Monitor ingestion success, scraper outcomes, and agent disagreements via Table Storage logs
- Review flagged items (low confidence, >20-point disagreements) as needed

**Principle**: Launch first with automation for all 121 officials, then layer in manual confirmation for known separatists. This balances speed to market with credibility.

## 4. Data Storage Architecture

### Azure Blob Storage Structure
**Main Container:** `articles` (via `ARTICLES_CONTAINER=articles`)

```
articles/
├── raw/serp/{politician-slug}/{timestamp}.json      # Raw SERPHouse responses
├── flagged/{politician-slug}/{date}.json            # Flagged articles for scraping
├── full/{politician-slug}/{article-hash}.json       # Scraped full text
├── stance/{politician-slug}/{article-hash}.json     # Sentiment analysis results
└── stances/
    ├── index.json                                   # Latest stance per official
    └── history/{politician-slug}.json               # Longitudinal stance record
```

## 5. Query Template

**Format:**
```
"<FullName>" "<Office>" AND (
  "Alberta separation" OR "Alberta independence" OR "Alberta sovereignty" 
  OR "Sovereignty Act" OR referendum OR secede OR "leave Canada" 
  OR "break from Canada" OR "Alberta Prosperity Project" 
  OR "Forever Canada" OR "Forever Canadian" 
  OR "remain in Canada" OR "stay in Canada" 
  OR "support Canada" OR "oppose separation" 
  OR "oppose independence" OR "pro-Canada stance" 
  OR "keep Alberta in Canada"
)
```

**Examples:**
- `"Danielle Smith" "MLA" AND ("Alberta separation" OR "remain in Canada")`
- `"Pat Kelly" "MP" AND ("Alberta independence" OR "oppose separation")`

## 6. Three-Agent Architecture

### Agent 1: Relevance Gate (Binary Filter)
**Purpose**: Determine if article contains ANY stance from the politician about Alberta-Canada relationship
**Model**: GPT-4o-mini (primary) / Claude-3.5-haiku (backup)

**What PASSES Agent 1**:
- ✅ Any mention of separation/independence (for or against)
- ✅ Statements about federalism, confederation, unity
- ✅ Comments about Alberta-Ottawa relations
- ✅ References to "fair deal", autonomy, sovereignty
- ✅ Economic statements implying need for Canada
- ✅ Defensive statements ("separation talk is harmful")

**Output**: Binary (YES/NO) with internal score for debugging

### Agent 2: Stance Scorer (Primary Analysis)
**Purpose**: Score politician's stance from 0 (strong separatist) to 100 (strong federalist)
**Model**: GPT-4o-mini (primary) / Claude-3.5-sonnet (backup)

**Scoring Framework**:

| Score | Classification | Example Statements |
|-------|---------------|-------------------|
| 90-100 | Explicitly Strong Pro-Canada | "Alberta must remain in Canada" |
| 70-89 | Clear Pro-Canada | "Federation has served us well" |
| 60-69 | Moderate Pro-Canada | "We need Canada's support" |
| 50-59 | Neutral/Avoided | "Albertans will decide" |
| 40-49 | Soft Pro-Separation | "Alberta isn't getting fair deal" |
| 20-39 | Clear Pro-Separation | "Should consider referendum" |
| 0-19 | Strong Pro-Separation | "Independence is our only option" |

**Required Output**:
- Score (0-100)
- Confidence (0-1)
- Evidence (≤50 words)
- AvoidedAnswering (boolean)

### Agent 3: Verification (Independent Check)
**Purpose**: Independently score the same article to verify Agent 2's assessment
**Model**: GPT-4o-mini (primary) / Claude-3.5-sonnet (backup)

**Agreement Logic**:
```javascript
if (Math.abs(agent2_score - agent3_score) <= 20) {
    agreement = true;
    final_score = (agent2_score + agent3_score) / 2;
} else {
    flag_for_human_review();
}
```

## 7. Data Storage Schema

### Stance Index Entry
```json
{
  "district_name": "Calgary-Edgemont",
  "office": "MLA",
  "fullName": "Julia Hayter",
  "stance": "Clear Pro-Canada",
  "score": 76.5,
  "confidence": 0.82,
  "evidence": "Smith argued federal health transfers demonstrate why Alberta should remain in Canada…",
  "link": "https://example.com/news-story",
  "lastUpdated": "2025-09-03T15:30:00Z"
}
```

### Individual Article Analysis
```json
{
  "articleId": "sha256_hash",
  "articleDate": "2025-08-30",
  "articleTitle": "Smith discusses federal transfers",
  "politician": "danielle-smith",
  "processedAt": "2025-08-30T15:30:00Z",
  
  "agent1": {
    "passed": true,
    "hasStance": true,
    "internalScore": 85
  },
  
  "agent2": {
    "stanceScore": 75,
    "confidence": 0.85,
    "evidence": "Smith argued federal health transfers demonstrate why Alberta should remain in Canada despite ongoing disputes",
    "avoidedAnswering": false,
    "classification": "Clear Pro-Canada"
  },
  
  "agent3": {
    "stanceScore": 78,
    "confidence": 0.80,
    "evidence": "Premier emphasized health transfers show value of federation while acknowledging provincial concerns",
    "agreement": true
  },
  
  "final": {
    "score": 76.5,
    "classification": "Clear Pro-Canada",
    "evidence": "Smith argued federal health transfers demonstrate why Alberta should remain in Canada despite ongoing disputes",
    "flaggedForReview": false,
    "reviewReason": null
  }
}
```

## 8. Success Metrics

### Quality Metrics
- **Agreement Rate**: >80% of articles (between Agent 2 & 3)
- **Automated Processing**: >95% require no human intervention
- **Evidence Extraction**: 100% of scores have supporting evidence

### Coverage Metrics  
- **Processing Rate**: All historical articles in first run
- **Politician Coverage**: All 121 politicians analyzed
- **Refresh Cycle**: New articles processed 1-2 times per week

## 9. Final Task List – CanadaWill Stance Tracking (Automation First)

### Task 1 – Roster Enrichment with Represent API Integration
**Goal**: Ensure every MLA and MP has a district_name (so stances line up with Represent API in the app).

**Subtasks:**
1.1 Load `backend/express-ingest/data/ab-roster-transformed.json`
1.2 For every MP, call Represent API by full name + office to fetch district_name
1.3 For every MLA, confirm district_name is correct and matches Represent API
1.4 Add district_name into each record, alongside fullName, office, slug, and aliases
1.5 Save enriched file to Blob as `data/officials.json` (this becomes the canonical roster)
1.6 **Verification**: Pick 3 MLAs + 3 MPs at random, run Represent API queries manually, confirm district_name matches what's in data/officials.json. Sign off when consistent.

### Task 2 – SERPHouse Query Builder Enhancement and 12-Month Backfill
**Goal**: Improve search quality and regenerate 12 months of article data.

**Subtasks:**
2.1 Update query builder to always include full name AND title variants
   - MLA: "MLA" or "Member of Legislative Assembly"
   - MP: "MP" or "Member of Parliament"
2.2 Add both separation keywords and unity keywords (see PRD v2.8)
2.3 Run 12-month backfill for all 121 officials in data/officials.json
2.4 Write outputs to Blob: `articles/raw/serp/{slug}/{YYYY-MM-DD}.json`
2.5 **Verification**: Open 5 sample JSONs. Confirm each has the correct official's name + title in the query, and at least one article is relevant to Alberta separation/remain. Sign off when satisfied.

### Task 3 – Snippet Filter Implementation
**Goal**: Narrow raw SERPHouse results to plausible separation/remain articles.

**Subtasks:**
3.1 Implement filter in canadawill-ingest to scan title + snippet
3.2 If headline/snippet includes separation/remain cues, mark as relevant
3.3 Write filtered metadata to Blob: `articles/flagged/{slug}/{YYYY-MM-DD}.json`
3.4 Push flagged URLs into scrape-queue
3.5 **Verification**: Run filter on 50 sample raw articles. Confirm that non-relevant ones (e.g., "library independence") are excluded and relevant ones are flagged. Sign off when accuracy >80%.

### Task 4 – Full-Text Scraper Implementation
**Goal**: Fetch article text for flagged articles.

**Subtasks:**
4.1 Worker reads from scrape-queue
4.2 Attempt fetch once using standard user agent
4.3 If successful → run readability extraction; save to Blob: `articles/full/{slug}/{article-hash}.json`
4.4 If blocked → mark paywalled in JSON and skip
4.5 Log status (ok, paywalled, error) in Table Storage
4.6 **Verification**: Manually test 5 URLs: confirm one fetch works, extracted text is readable, paywalled sites are correctly marked. Sign off when working end-to-end.

### Task 5 – Three-Agent Stance Detection Pipeline
**Goal**: Run Agents 1–3 on scraped articles to assign stance.

**Subtasks:**
5.1 Configure input path: `articles/full/{slug}/....`
5.2 Configure output path: `articles/stance/{slug}/{article-hash}.json`
5.3 Agent 1: Binary relevance (is this article about Alberta separation/remain?)
5.4 Agent 2: 0–100 stance scoring, confidence, ≤50-word evidence, classification
5.5 Agent 3: Independent verification; average if scores within 20 points; mark uncertain otherwise
5.6 **Verification**: Process 10 articles end-to-end. Confirm each output has: score, confidence ≥0.6 (if published), evidence ≤50 words, and classification. Sign off when outputs match schema.

### Task 6 – Stance Index Generator
**Goal**: Build a Represent-friendly stance index for the app.

**Subtasks:**
6.1 Summarize latest stance for each official from `articles/stance/....`
6.2 Write to `stances/index.json`
   - Keys: district_name + elected_office
   - Include: fullName, slug, stanceClassification, finalScore, confidence, evidence, link
6.3 Write per-official histories to `stances/history/{slug}.json`
6.4 **Verification**: Open `stances/index.json`. Confirm entries for 5 officials. Ensure fields are populated correctly and join cleanly with Represent API responses (by district_name + elected_office). Sign off once app can map.

### Task 7 – Frontend Integration
**Goal**: Show stance results and contact option in app.canadawill.ca.

**Subtasks:**
7.1 Connect frontend to `stances/index.json`
7.2 Display stance badge (green = pro-Canada, red = pro-separation, gray = unknown)
7.3 Show evidence snippet (≤50 words) and link (skip if paywalled)
7.4 Add "Contact" button (mailto) for officials with stance=unknown. Pull email from data/officials.json
7.5 **Verification**: Search for an address in app. Confirm MLA/MP stance displays correctly, with evidence and link. Click "Contact" to confirm mailto opens. Sign off when live.

### Key Notes
- **Automation first**: All 121 MLAs/MPs are processed automatically. Manual tweaks (the 10–11 known separatists) can be layered in later.
- **Integration now**: Roster enrichment must ensure district_name + elected_office line up with Represent API.
- **Evidence**: Each stance must have a short supporting quote and a working link (unless paywalled).
- **Verification built in**: Every task ends with proof/sign-off.
- **Only run on azure** (do not run locally ever)
- **Do not make assumptions**
- **Always apply KISS principles**
- **SERPHouse documentation located here**: `/Users/Shared/Previously Relocated Items/Security/Tim/Work/Clever_Trout/CanadaWill/Background/Serp 19 August 2025.pdf`

## 10. Workflow + PRD Summary

### Stage 1 – SERPHouse ingestion and raw capture
**Goal**: Pull SERPHouse results for MLAs and MPs and store them in Blob.

1. **Roster integration**
   1.1 Merge MLA and MP rosters into one master list.
   1.2 Deduplicate by name and email.
   1.3 Normalize slugs (URL-safe names) and add metadata (full name, title, email, riding).
   1.4 Store combined roster as data/officials.json in Blob.

2. **Query template setup**
   2.1 Define the SERPHouse query format with Alberta separation/remain keywords.
   2.2 Confirm 365-day time window and Canadian news domain.
   2.3 Parameterize the template for each slug in officials.json.

3. **Ingestion job (inside canadawill-ingest)**
   3.1 Implement a scheduled job to call SERPHouse for each official.
   3.2 Save each JSON result under news/raw/serp/<slug>/<YYYY>/<MM>/<DD>.json.
   3.3 Log call status and failures to Table Storage.

### Stage 2 – Flagged article filtering and full-text fetching
**Goal**: Narrow down raw SERPHouse results to possibly relevant articles ("flagged"), then scrape the full text.

1. **Snippet filter (inside canadawill-ingest)**
   1.1 Function reads each new SERPHouse JSON in news/raw/serp/....
   1.2 For every article, inspect headline + snippet.
   1.3 If text contains separation/remain cues, mark as "flagged".
   1.4 Save metadata (official, date, title, snippet, URL) to Blob under articles/flagged/<slug>/<date>.json.
   1.5 Push URLs into an internal queue for scraping.

2. **Full-text fetcher (inside canadawill-ingest)**
   2.1 Worker dequeues URLs from the flagged queue.
   2.2 Fetch the page once using a standard user agent.
   2.3 If content loads → run readability extraction to capture the article body.
   2.4 If blocked → record status as paywalled. Do not retry.
   2.5 Save outputs (title, byline, publish date, status, text if available) to Blob at articles/full/<slug>/<hash>.json.
   2.6 Log status to Table Storage for monitoring.

### Stage 3 – Stance detection with Agents
**Goal**: On full-text articles, decide relevance and assign stance.

1. **Agent 1 – Relevance**
   1.1 Input: full article text.
   1.2 Ask: "Is this article about Alberta leaving or staying in Canada?"
   1.3 Output: true/false.
   1.4 If false, stop. If true, forward to Agent 2.

2. **Agent 2 – Stance**
   2.1 Input: relevant article.
   2.2 Ask: "Does this article show the official as pro-separation, pro-Canada, or neutral?"
   2.3 Record stance, confidence score, and evidence quotes.
   2.4 Save to Blob under articles/stance/<slug>/<hash>.json.

3. **Agent 3 – Verification**
   3.1 Re-run stance classification on the same article.
   3.2 Compare to Agent 2's output.
   3.3 If results disagree beyond threshold, mark stance as "uncertain".
   3.4 Store verification outcome alongside stance file.

4. **Index updates**
   4.1 Update stances/index.json with the latest stance per official.
   4.2 Maintain a history file per official in stances/history/<slug>.json.

### Stage 4 – App integration
**Goal**: Expose stances to the public on app.canadawill.ca.

1. **Data integration**
   1.1 Connect frontend to stances/index.json in Blob.
   1.2 Add stance field to profile cards (green = pro-Canada, red = pro-separation, gray = unknown).
   1.3 Display link to the evidence article.

2. **Contact button**
   2.1 Pull email addresses from officials.json.
   2.2 Add a "Contact" button for each official.
   2.3 Generate a mailto: link with subject and body pre-filled (e.g. "Please oppose Alberta separation").

3. **Deployment**
   3.1 Update frontend code with stance and contact features.
   3.2 Deploy build to Azure App Service.
   3.3 Verify end-to-end flow: search → stance display → mailto link.

## 11. KISS Defaults

- **Roster enrichment**: Populate missing riding for MPs from Represent API
- **Weekly newspapers**: Defer direct scrapers until phase 2
- **Retention**: Keep stances forever; trim raw SERPHouse JSONs after 18 months
- **Paywalls**: Skip entirely
- **Schedule**: Run backfill once, then 1–2x per week updates

## 12. PRD Update — Relevance Screening, Full-Text Fetch, and Stance (10 September 2025 2220)

### Objective

Use AI (no rules) to screen headlines + snippets and decide if an article is about Alberta separation or remaining in Canada and is tied to the named politician. If yes, fetch the full text and later classify stance.

### Scope (A → B → C)

#### Part A — Relevance screening (AI-only)

**Input per item**: person_name, title, snippet, url (do not open the URL).

**Model task**: Decide if the piece is about Alberta leaving or remaining in Canada (the debate counts), and whether it ties to the politician.

**Output JSON fields** (also written to a master table):
- row_id (file + row index or JSON row number)
- person_name
- date (if present in source)
- article_title
- snippet
- url
- relevance_score (0–100)
- relevant (true/false)
- ties_to_politician (true/false)
- reason (30–50 words citing strongest cues)

**Edge cases**:
- Sovereignty/autonomy must be considered (model decides if it signals the debate).
- Dodges still count as relevant.
- Sports/off-topic should be not relevant.
- Premier Smith can be referenced as MLA and Premier; others are MLA/MP.

**Canonical cues** (guidance to the model; not rules): separation/independence/secession; remain/stay/unity; statehood / 51st state / 51 state / join the US / annexation; proxies like Sovereignty Act, Fair Deal Panel, equalization, CPP exit/Alberta Pension Plan, Alberta Police/RCMP replacement, Ottawa vs Alberta, Alberta Prosperity Project, Wexit/Buffalo Declaration.

#### Part B — Full-text fetch

**Gate**: Fetch if relevant == true and relevance_score ≥ 70.

**Review lane** (no delete): Keep 40–69 for possible later fetch.

**Full-text record**: { url, fetched_at, status, text, content_type }.

**Storage path**: news/fulltext/serp/<slug>/<ISO>._full.json.

#### Part C — Stance classification (AI-only)

On the fetched full text, classify the politician's stance:
- Pro Canada (stay/remain)
- Pro Separation (leave/independence/statehood/join the US)
- No Comment (dodged or no clear position)

**Append to the master table**:
- stance (three labels above)
- stance_rationale (1–2 sentences)

### Master table (single source of truth)

Flat table reused across B and C.

| row_id | person_name | date | article_title | snippet | url | relevance_score | relevant | ties_to_politician | reason | stance | stance_rationale |
|--------|-------------|------|---------------|---------|-----|-----------------|----------|-------------------|--------|--------|------------------|

**File format**: CSV (UTF-8, no BOM) or JSONL.

**Location**: news/analysis/master_relevance.csv.

### Decision gates (A → B)

- **Fetch**: relevant == true and relevance_score ≥ 70.
- **Review**: relevant == true and 40–69.
- **Skip**: <40.

No deletions at this stage.

### Telemetry and audit

Log each model call with row_id, model, duration_ms, and success/failure.

Application Insights dashboards for A/B/C pass-through counts and errors. (Existing App Insights remains the source. Azure runtime snapshot: CanadWi…)

### Storage conventions

- Raw SERP: news/raw/serp/<slug>/<ISO>.json
- Analysis outputs: news/analysis/serp/<slug>/<ISO>._llm_relevance.json (optional per-item dump)
- Master table: news/analysis/master_relevance.csv
- Full text: news/fulltext/serp/<slug>/<ISO>._full.json

### Updated F-Series Roadmap (what, not how)

(Based on the existing roadmap; extended to include A→B→C.)

- **F1** — Baseline health and diagnostics (green /api/health, routes). feat: Complete SERPHouse integr…
- **F2** — SERPHouse topical capture (proof) (found>0, then roster). feat: Complete SERPHouse integr…
- **F3** — Sweeps (streaming; safe defaults). feat: Complete SERPHouse integr…
- **F4** — Backfill (60-day; daily delta). feat: Complete SERPHouse integr…
- **F5** — Normalize & dedupe (URL canonicalization).
- **F6** — Durable storage schema (raw + normalized). feat: Complete SERPHouse integr…
- **F7** — Read/search endpoints (for dashboard). feat: Complete SERPHouse integr…
- **F8** — Scheduled captures (quota-aligned). feat: Complete SERPHouse integr…
- **F9** — Monitoring & alerting (App Insights). feat: Complete SERPHouse integr…
- **F10** — Export/audit (provenance). feat: Complete SERPHouse integr…
- **F11** — Relevance screening (AI-powered) - GPT scores each SERP item (title + snippet + politician) with relevance_score 0–100; outputs to master_relevance.csv.
- **F12** — Full text + stance (AI-powered) - Fetch full text for relevant items; classify Pro Canada / Pro Separation / No Comment; append stance + stance_rationale to the master table.

### Acceptance criteria

- **A1**. For a sampled set of items, 95% of sports/off-topic headlines score <40.
- **A2**. For known explicit separation/remain headlines, 90% score ≥70.
- **B1**. All items with relevance_score ≥ 70 have a fetched full-text record saved.
- **C1**. Stance labels populate for 90% of fetched items without manual intervention.
- **Ops**. Each stage (A/B/C) logs counts and errors to App Insights with a daily roll-up.

## 13. PRD Update – Phase A: Relevance Screening (11 September 2025 0839)

### Objective

Screen all SERP articles (title + snippet + politician) using AI only. Determine whether each article is about Alberta separation or remaining in Canada (any stance, including dodges). If relevant, tie it back to the politician. This stage is for scoring only — no stance classification or filtering yet.

### Scope

#### In scope

- Iterate every blob in news/raw/serp/<slug>/*.json
- For each row, send to GPT-5-mini with fixed prompt
- Append results to a master CSV and JSONL
- Provide a simple /api/relevance/status endpoint for monitoring
- Implement resume logic to skip already-processed rows

#### Out of scope

- Threshold cuts (all rows scored, nothing filtered yet)
- Full-text fetching (Phase B)
- Stance classification (Phase C)
- Rule-based keyword checks

### Model & Prompt

**Model:** gpt-5-mini  
**Temperature:** 0  
**Response format:** JSON object

**Prompt:**
```
Person: {person_name}
Title: {title}
Snippet: {snippet}

Question: Is this article about Alberta separation, independence, secession, statehood (incl. '51 state'),
or remaining in Canada (any stance, even dodges)? Is it tied to this politician?

Answer ONLY in JSON:
{"relevance_score":0-100,"relevant":true|false,"ties_to_politician":true|false,"reason":"30-50 words"}
```

### Output Specification

#### CSV

**File:** news/analysis/master_relevance.csv  
**Header row:**
```
row_id,run_id,person_name,date,article_title,snippet,url,relevance_score,relevant,ties_to_politician,reason
```

#### JSONL

**File:** news/analysis/master_relevance.jsonl  
**Schema per line:**
```json
{
  "row_id": "danielle-smith_20250909T225609Z_42",
  "run_id": "2025-09-11T14:30:00Z",
  "person_name": "Danielle Smith",
  "date": "2025-09-10T12:34:56Z",
  "article_title": "Smith says Alberta must decide its future",
  "snippet": "The Premier avoided directly answering questions on separation...",
  "url": "https://example.com/article/123",
  "relevance_score": 92,
  "relevant": true,
  "ties_to_politician": true,
  "reason": "Title and snippet directly mention Alberta's political future, with the Premier dodging questions about independence. Clear connection to separation debate."
}
```

### Status Endpoint

**Path:** /api/relevance/status  
**Backed by:** local JSON file (relevance_status.json)

**Response schema:**
```json
{
  "run_id": "2025-09-11T14:30:00Z",
  "total": 170000,
  "processed": 45200,
  "pending": 124800,
  "errors": 12,
  "last_row": "danielle-smith_20250909T225609Z_42",
  "startedAt": "2025-09-11T14:30:00Z",
  "updatedAt": "2025-09-11T15:05:12Z"
}
```

**Fields:**
- `run_id`: ISO timestamp of current batch run
- `total`: total articles discovered
- `processed`: rows completed
- `pending`: total – processed
- `errors`: number of rows skipped after retries
- `last_row`: most recent row_id processed
- `startedAt` / `updatedAt`: ISO timestamps

### Resume Logic

- On startup, stream existing master_relevance.csv once
- Build a Set of existing row_ids in memory (~170k rows, safe)
- Skip any row_id already in that Set
- Always append, never overwrite
- If files don't exist, create with headers

### Error Handling

- Retry failed GPT calls up to 2 times (exponential backoff)
- If still failing → log error, increment error count, skip row
- Parsing errors handled the same way
- Never stop the entire batch for one failure

### Row ID Convention

`{slug}_{fileIndex}_{articleIndex}`

- `slug` = folder name (e.g., danielle-smith)
- `fileIndex` = filename without extension (timestamp)
- `articleIndex` = array index inside raw[]

### Execution Notes

- **Container:** canadawillfuncstore2
- **Folder:** news/raw/serp
- **Process:** sequential, streaming one article at a time
- **Deploy inside:** canadawill-ingest app service
- **Status visible:** via /api/relevance/status

This section fully defines Phase A. Cursor can now implement with zero assumptions.
