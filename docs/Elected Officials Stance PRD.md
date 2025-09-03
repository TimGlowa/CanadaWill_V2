# Elected Officials Stance PRD
### Version 3.0 - September 3, 2025

## 1. Executive Summary

This PRD defines an automated sentiment analysis pipeline to determine Alberta MLAs' and MPs' stances on Alberta's relationship with Canada. The system emphasizes speed to market, full coverage, and credibility through a three-phase approach: automated backfill for all 121 officials, manual verification of known separatists, and ongoing automated updates.

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

## 9. Implementation Tasks

### Task 1 – SERPHouse Re-run
- Update query template with name + title
- Backfill last 12 months
- Store outputs in `articles/raw/serp/....`

### Task 2 – Snippet Filter
- Scan headlines/snippets for separation/unity cues
- Save flagged metadata to `articles/flagged/....`
- Queue URLs for scraping

### Task 3 – Scraper
- Fetch once per URL, save cleaned text to `articles/full/....`
- Mark paywalled where blocked
- Log status to Table Storage

### Task 4 – Agent Pipeline
- Run Agents 1–3 on scraped text
- Save outputs to `articles/stance/....`
- Update stance index + history

### Task 5 – App Integration
- Connect frontend to `stances/index.json`
- Add stance display + evidence snippet + article link
- Add mailto: button for unknowns

## 10. KISS Defaults

- **Roster enrichment**: Populate missing riding for MPs from Represent API
- **Weekly newspapers**: Defer direct scrapers until phase 2
- **Retention**: Keep stances forever; trim raw SERPHouse JSONs after 18 months
- **Paywalls**: Skip entirely
- **Schedule**: Run backfill once, then 1–2x per week updates
