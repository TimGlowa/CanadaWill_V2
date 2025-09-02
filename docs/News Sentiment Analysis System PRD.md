# News Sentiment Analysis System PRD
### Version 2.5 - August 31, 2025

---

## 1. Executive Summary

This PRD defines a three-agent sentiment analysis system to determine elected officials' stances on Alberta's relationship with Canada based on collected news articles. The system will detect ANY mention of the Alberta-Canada relationship (pro-unity through pro-separation) and score each politician's position with nuanced gradients.

## 2. Core Objective

**Determine where each of Alberta's 121 elected officials (expanding to include all Alberta mayors) stands on the spectrum from "Strong Canadian Federalist" to "Strong Alberta Separatist" based on their public statements in news media.**

## 3. Data Collection Context

We have captured news articles mentioning elected officials going back 12 months using SERPHouse and will continue searching for new stories every 24-48 hours. All data is stored in Azure Blob Storage containers following the structure outlined in Section 5.

## 4. Three-Agent Architecture

### Agent 1: Relevance Gate (Binary Filter)
**Purpose**: Determine if article contains ANY stance from the politician about Alberta-Canada relationship
**Model**: GPT-5-nano (primary) / Claude-3.5-haiku (backup)

**What PASSES Agent 1**:
- ✅ Any mention of separation/independence (for or against)
- ✅ Statements about federalism, confederation, unity
- ✅ Comments about Alberta-Ottawa relations
- ✅ References to "fair deal", autonomy, sovereignty
- ✅ Economic statements implying need for Canada ("we need federal support")
- ✅ Defensive statements ("separation talk is harmful")

**What FAILS Agent 1**:
- ❌ No mention of federal-provincial relationship
- ❌ Politician not mentioned in article
- ❌ Pure provincial issues with no federal context

**Output**: Binary (YES/NO) with internal score for debugging

### Agent 2: Stance Scorer (Primary Analysis)
**Purpose**: Score politician's stance from 0 (strong separatist) to 100 (strong federalist)
**Model**: GPT-5-mini (primary) / Claude-3.7-sonnet (backup)

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
**Model**: GPT-5-mini (primary) / Claude-3.7-sonnet (backup)

**Process**: Same as Agent 2 but without seeing Agent 2's results

**Agreement Logic**:
```python
if abs(agent2_score - agent3_score) <= 20:
    agreement = True
    final_score = (agent2_score + agent3_score) / 2
else:
    flag_for_human_review()
```

## 5. Data Storage Architecture

### Azure Blob Storage Structure
**Main Container:** `articles` (via `ARTICLES_CONTAINER=articles`)

```
articles/
├── raw/
│   └── serp/
│       └── {politician-slug}/
│           └── {timestamp}.json  # Raw SERPHouse responses
├── sentiment/
│   └── {politician-slug}/
│       └── {article-hash}.json   # Sentiment analysis results
└── tracker/
    └── majors/
        └── {ISO-date}.json        # Daily ingestion status
```

**Example paths:**
- Raw: `articles/raw/serp/danielle-smith/2025-08-23T04-40-06-091Z.json`
- Sentiment: `articles/sentiment/danielle-smith/abc123def456.json`

## 6. Data Storage Schema

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

## 7. AI Service Configuration

### Available AI Services (via Environment Variables)
- **Primary**: `OPENAI_API_KEY` - OpenAI GPT-5 models for sentiment analysis
- **Backup**: `ANTHROPIC_API_KEY` - Claude models as fallback if OpenAI fails
- **Azure Storage**: `AZURE_STORAGE_CONNECTION` - Blob storage access
- **News Source**: `SERPHOUSE_API_TOKEN` - SERPHouse API for article retrieval

### Model Configuration
```javascript
const MODELS = {
  AGENT1_MODEL: "gpt-5-nano",
  AGENT2_MODEL: "gpt-5-mini",
  AGENT3_MODEL: "gpt-5-mini",
  BACKUP_AGENT1: "claude-3.5-haiku",
  BACKUP_AGENT2: "claude-3.7-sonnet",
  BACKUP_AGENT3: "claude-3.7-sonnet"
};
```

## 8. Special Handling Rules

### Danielle Smith (Premier)
- UCP party statements = her position (as leader)
- Otherwise scored exactly the same as any other politician

### Other MLAs/MPs
- Party statements ≠ automatic individual position
- Look for personal stance even if differs from party
- "The party says X but I believe Y" → use Y

### Context Modifiers
- **Direct response to separation question**: High weight
- **Volunteered opinion**: Medium weight  
- **Implied from other topic**: Lower weight
- **Avoided when asked directly**: Score 50-55, flag "avoided"

## 9. Processing Pipeline

```yaml
For each article in blob storage:
  1. Load article from articles/raw/serp/{politician}/*
  2. Agent 1: Check relevance (GPT-5-nano)
     - NO → Log as filtered, stop
     - YES → Continue
  3. Agent 2: Score stance (GPT-5-mini)
  4. Agent 3: Verify stance (GPT-5-mini)
  5. Compare scores
  6. Store individual article score (no aggregation yet)
  7. Flag disagreements >20 points for review
```

## 10. Human Review Triggers (Minimal)

System handles 95% automatically. Only flag for review:
- **Conflicting results**: Agent 2 and Agent 3 disagree by >20 points
- **Both agents low confidence**: Both <0.4 confidence
- **Extreme contradiction**: Same politician scores differ by >50 points across articles

**NOT flagged**:
- Avoided answering (just scored as 50-55)
- Low data politicians (just marked as "Stance Unknown")
- Unexpected scores (system grades everyone equally)

## 11. Success Metrics

### Quality Metrics
- **Agreement Rate**: >80% of articles (between Agent 2 & 3)
- **Automated Processing**: >95% require no human intervention
- **Evidence Extraction**: 100% of scores have supporting evidence

### Coverage Metrics  
- **Processing Rate**: All historical articles in first run
- **Politician Coverage**: All 121 politicians analyzed (expanding to mayors)
- **Refresh Cycle**: New articles processed every 24-48 hours

## 12. Implementation Tasks

### **TASK 1: Infrastructure + Agent 1 (Steps 1-2)**

**Infrastructure (Step 1):**
- ✅ **DONE** - SentimentAnalyzer class created
- ✅ **DONE** - Azure Blob Storage integration
- ✅ **DONE** - OpenAI/Anthropic SDK initialization
- ✅ **DONE** - Three-agent method structure

**Agent 1 Implementation (Step 2):**
- **Subtask 1.1**: Create relevance gate prompt
  - Input: article text + politician name
  - Prompt: "Does this article contain any statement from [politician] about Alberta's relationship with Canada, including views on unity, separation, federalism, or independence?"
  - Output: {passed: boolean, internalScore: number, reason: string}
  - Model: GPT-5-nano (as specified in PRD)

- **Subtask 1.2**: Test relevance gate with real data
  - Load 5-10 real Danielle Smith articles from Azure
  - Run through Agent 1
  - Verify: relevant articles pass, irrelevant articles fail
  - Success criteria: >80% accuracy on relevance detection

**CURSOR PROMPT FOR TASK 1:**
```
Create express-ingest/src/sentiment/sentimentAnalyzer.js with:
1. Import OpenAI SDK (primary) and Anthropic SDK (backup)
2. Define model map at top:
   const MODELS = {
     AGENT1_MODEL: 'gpt-5-nano',
     AGENT2_MODEL: 'gpt-5-mini',
     AGENT3_MODEL: 'gpt-5-mini',
     BACKUP_AGENT1: 'claude-3.5-haiku',
     BACKUP_AGENT2: 'claude-3.7-sonnet',
     BACKUP_AGENT3: 'claude-3.7-sonnet'
   };
3. SentimentAnalyzer class with methods: analyzeArticle(), agent1Check(), agent2Score(), agent3Score()
4. Read OPENAI_API_KEY and ANTHROPIC_API_KEY from environment
5. Implement agent1Check() using GPT-5-nano:
   - Takes article text and politician name
   - Asks if article contains ANY stance from politician about Alberta-Canada relationship
   - Returns {passed: boolean, internalScore: number, reason: string}
   - Temperature=0 for consistency
6. agent2Score() and agent3Score() return mock data for now
Test with real articles from articles/raw/serp/danielle-smith/
```

### **TASK 2: Scoring + Verification (Steps 3-4)**

**Agent 2 Implementation (Step 3):**
- **Subtask 2.1**: Create stance scoring prompt
  - Input: article text + politician name
  - Prompt: Score 0-100 with classification framework
  - Output: {stanceScore, confidence, evidence, avoidedAnswering, classification}
  - Model: GPT-5-mini (as specified in PRD)
  - Special handling: Danielle Smith UCP statements = her position

- **Subtask 2.2**: Test stance scoring accuracy
  - Use same test articles from Task 1
  - Verify scores are within expected ranges
  - Test Danielle Smith special case

**Agent 3 Implementation (Step 4):**
- **Subtask 2.3**: Create verification prompt
  - Identical to Agent 2 but different wording
  - Must not see Agent 2 results
  - Same output structure

- **Subtask 2.4**: Implement score comparison logic
  - Agreement threshold: ≤20 points difference
  - Final score: average if agreement, null if disagreement
  - Flag for review: disagreement >20 points

**CURSOR PROMPT FOR TASK 2:**
```
In sentimentAnalyzer.js, implement:
1. agent2Score() using GPT-5-mini:
   - Score 0-100 (0=strong separatist, 100=strong federalist)
   - Return {stanceScore, confidence, evidence (max 50 words), avoidedAnswering, classification}
   - Special: if politician='danielle-smith' and text mentions 'UCP', treat party position as her position
2. agent3Score() using GPT-5-mini:
   - Identical to agent2Score but different prompt wording
   - Must not see Agent 2 results
3. compareScores() method:
   - Returns {agreement: boolean, finalScore: number, flagForReview: boolean}
   - Agreement if difference ≤20 points
4. Add fallback to Anthropic models if OpenAI fails
Test with same articles from Task 1.
```

### **TASK 3: Storage + Processing (Steps 5-6)**

**Blob Storage Integration (Step 5):**
- **Subtask 3.1**: Implement article loading
  - Method: `loadArticlesForPolitician(politicianSlug)`
  - Path: `articles/raw/serp/{politician}/*.json`
  - Parse SERPHouse JSON responses
  - Extract article text (title + snippet)

- **Subtask 3.2**: Implement result storage
  - Method: `saveSentimentResult(result)`
  - Path: `articles/sentiment/{politician}/{articleHash}.json`
  - Store complete analysis results
  - Include all agent outputs + final result

**Processing Script (Step 6):**
- **Subtask 3.3**: Create main processing loop
  - Load all politicians from roster
  - For each politician: load articles from blob storage
  - Process through all three agents
  - Save results to sentiment storage
  - Progress logging: "Processing {politician}: {x}/{total} articles"

- **Subtask 3.4**: Error handling + retry logic
  - Graceful failure on individual articles
  - Continue processing other articles
  - Log errors for debugging

**CURSOR PROMPT FOR TASK 3:**
```
Create two files:
1. express-ingest/src/sentiment/sentimentStorage.js:
   - Import @azure/storage-blob
   - loadArticlesForPolitician(slug): read from articles/raw/serp/{slug}/*.json
   - saveSentimentResult(result): save to articles/sentiment/{slug}/{hash}.json
   - getUnprocessedArticles(slug): return articles not yet in sentiment folder
2. express-ingest/src/sentiment/processSentiment.js:
   - Load politicians from roster
   - For each: load articles, run through all 3 agents, save results
   - Log progress: 'Processing {politician}: {x}/{total} articles'
   - Handle errors gracefully with retry logic
Use existing azureStorageService.js as reference.
```

### **TASK 4: API + Batch (Steps 7-8)**

**API Endpoints (Step 7):**
- **Subtask 4.1**: POST `/api/sentiment/process`
  - Input: {politician: string, limit?: number}
  - Process articles for specific politician
  - Return: {processed: number, flagged: number, errors: array}

- **Subtask 4.2**: GET `/api/sentiment/status`
  - Check processing status
  - Return: current progress, last processed timestamp

**Batch Processing (Step 8):**
- **Subtask 4.3**: Implement `processAllPoliticians()`
  - Process all 121 politicians in roster
  - Configurable concurrency (default: 5)
  - Progress tracking saved to `articles/sentiment/progress.json`

- **Subtask 4.4**: Resume capability
  - Check progress file on startup
  - Skip already processed politicians
  - Continue from where left off

**CURSOR PROMPT FOR TASK 4:**
```
Add to express-ingest/ingest.js:
1. POST /api/sentiment/process endpoint:
   - Body: {politician: string, limit?: number}
   - Process articles for that politician
   - Return: {processed: number, flagged: number, errors: array}
2. GET /api/sentiment/status endpoint:
   - Return current processing status
3. In processSentiment.js add:
   - processAllPoliticians() method for all 121 politicians
   - Batch processing with concurrency=5
   - Progress tracking to articles/sentiment/progress.json
   - Resume capability if interrupted
```

### **TASK 5: Review + Monitoring (Steps 9-11)**

**Review Queue (Step 9):**
- **Subtask 5.1**: Track flagged articles
  - Save to `articles/sentiment/review-queue.json`
  - Include: disagreement reason, scores, article details
  - Methods: `addToQueue()`, `getQueue()`, `resolveReview()`

- **Subtask 5.2**: API endpoint
  - GET `/api/sentiment/review-queue`
  - Return all flagged articles for human review

**Test Suite (Step 10):**
- **Subtask 5.3**: Create comprehensive tests
  - Test with 5 sample articles for Danielle Smith
  - Verify Agent 1 filters correctly
  - Verify Agent 2 & 3 produce scores within expected ranges
  - Test special cases: avoided answering, UCP statements
  - Output pass/fail status

**Monitoring Dashboard (Step 11):**
- **Subtask 5.4**: GET `/api/sentiment/dashboard`
  - Total articles processed per politician
  - Average stance score per politician
  - Number of flagged reviews
  - Processing statistics (agreement rate, confidence levels)
  - Last processing timestamp

**CURSOR PROMPT FOR TASK 5:**
```
Create three components:
1. express-ingest/src/sentiment/reviewQueue.js:
   - Track flagged articles (disagreement >20 points)
   - Save to articles/sentiment/review-queue.json
   - Methods: addToQueue(), getQueue(), resolveReview()
2. GET /api/sentiment/review-queue endpoint in ingest.js
3. GET /api/sentiment/dashboard endpoint that returns:
   - Total articles processed per politician
   - Average stance scores
   - Number of flagged reviews
   - Agreement rate statistics
   - Last processing timestamp
```

### **TASK 6: Production (Step 12)**

**Production Script (Step 12):**
- **Subtask 6.1**: Create `runSentimentAnalysis.js`
  - Can be run via node command or scheduled job
  - Process all politicians' articles from last 12 months
  - Log to `articles/sentiment/logs/{date}.log`
  - Send completion notification (console log for now)

- **Subtask 6.2**: Graceful shutdown handling
  - Handle SIGTERM signal
  - Save progress before exiting
  - Clean shutdown of Azure connections

**CURSOR PROMPT FOR TASK 6:**
```
Create express-ingest/scripts/runSentimentAnalysis.js:
1. Process all politicians' articles from last 12 months
2. Can be run via node command or scheduled job
3. Log to articles/sentiment/logs/{date}.log
4. Progress tracking with resume capability
5. Graceful shutdown on SIGTERM
6. Completion notification (console log)
Test with subset of 10 politicians first.
```

### Azure Portal Steps (You'll Do Manually):
1. Verify OPENAI_API_KEY is set in App Service environment variables
2. Verify ANTHROPIC_API_KEY is set as backup
3. Check AZURE_STORAGE_CONNECTION is configured
4. Monitor API usage in OpenAI dashboard
5. Set up scheduled job if needed (Azure Logic Apps or Timer Trigger)
