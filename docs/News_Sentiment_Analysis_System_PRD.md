# Product Requirements Document (PRD)
## News Sentiment Analysis System for Alberta-Canada Stance Detection
### Version 2.3 - August 31, 2025

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
- Evidence (≤50 words)  // Updated from 20 words
- AvoidedAnswering (boolean)

### Agent 3: Verification (Independent Check)
**Purpose**: Independently score the same article to verify Agent 2's assessment

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
- **Primary**: `OPENAI_API_KEY` - OpenAI GPT-4 for sentiment analysis
- **Backup**: `ANTHROPIC_API_KEY` - Claude as fallback if OpenAI fails
- **Azure Storage**: `AZURE_STORAGE_CONNECTION` - Blob storage access
- **News Source**: `SERPHOUSE_API_TOKEN` - SERPHouse API for article retrieval

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
  2. Agent 1: Check relevance
     - NO → Log as filtered, stop
     - YES → Continue
  3. Agent 2: Score stance (0-100)
  4. Agent 3: Verify stance (0-100)
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

## 12. Implementation Plan - Cursor Prompts

### Step 1: Create Base Infrastructure
```
PROMPT 1: "Create a new file express-ingest/src/sentiment/sentimentAnalyzer.js that:
1. Imports Azure OpenAI SDK
2. Creates a class SentimentAnalyzer with methods: analyzeArticle(), agent1Check(), agent2Score(), agent3Score()
3. Reads OPENAI_API_KEY from environment
4. Has a fallback to ANTHROPIC_API_KEY if OpenAI fails
Don't implement the logic yet, just create the structure with empty methods that return mock data."
```

### Step 2: Implement Agent 1 (Relevance Gate)
```
PROMPT 2: "In sentimentAnalyzer.js, implement agent1Check() method:
1. Takes article text and politician name as input
2. Creates a prompt asking: 'Does this article contain any statement from [politician] about Alberta's relationship with Canada, including views on unity, separation, federalism, or independence?'
3. Returns {passed: boolean, internalScore: number, reason: string}
4. Use GPT-4 with temperature=0 for consistency"
```

### Step 3: Implement Agent 2 (Stance Scorer)
```
PROMPT 3: "In sentimentAnalyzer.js, implement agent2Score() method:
1. Takes article text and politician name
2. Creates prompt with scoring framework (0-19: Strong Sep, 20-39: Clear Sep, 40-49: Soft Sep, 50-59: Neutral, 60-69: Mod Canada, 70-89: Clear Canada, 90-100: Strong Canada)
3. Asks for: score, confidence (0-1), evidence (max 50 words), avoidedAnswering boolean
4. Returns structured JSON response
5. Handle Danielle Smith special case (UCP statements = her position)"
```

### Step 4: Implement Agent 3 (Verification)
```
PROMPT 4: "In sentimentAnalyzer.js, implement agent3Score() method:
1. Identical to agent2Score but with slightly different prompt wording
2. Must not see Agent 2's results
3. Returns same structure as Agent 2
4. Add compareScores() method that returns {agreement: boolean, finalScore: number, flagForReview: boolean}"
```

### Step 5: Create Blob Storage Integration
```
PROMPT 5: "Create express-ingest/src/sentiment/sentimentStorage.js that:
1. Imports @azure/storage-blob
2. Reads articles from articles/raw/serp/{politician}/*.json
3. Saves results to articles/sentiment/{politician}/{articleHash}.json
4. Methods: loadArticlesForPolitician(), saveSentimentResult(), getUnprocessedArticles()
Use existing azureStorageService.js as reference for connection setup."
```

### Step 6: Create Main Processing Script
```
PROMPT 6: "Create express-ingest/src/sentiment/processSentiment.js that:
1. Loads list of all politicians from roster
2. For each politician: loads articles from blob storage
3. For each article: runs Agent 1, if passes runs Agent 2 & 3
4. Compares scores, saves results
5. Logs progress: 'Processing {politician}: {x}/{total} articles'
6. Handles errors gracefully with retry logic"
```

### Step 7: Add API Endpoint
```
PROMPT 7: "In express-ingest/ingest.js, add new endpoint POST /api/sentiment/process that:
1. Accepts {politician: string, limit?: number} in body
2. Calls processSentiment for that politician
3. Returns {processed: number, flagged: number, errors: array}
4. Add GET /api/sentiment/status to check processing status"
```

### Step 8: Add Batch Processing
```
PROMPT 8: "Modify processSentiment.js to add:
1. processAllPoliticians() method that processes all 121 politicians
2. Batch processing with configurable concurrency (default 5)
3. Progress tracking saved to articles/sentiment/progress.json
4. Resume capability if process is interrupted"
```

### Step 9: Add Review Queue
```
PROMPT 9: "Create express-ingest/src/sentiment/reviewQueue.js that:
1. Tracks all flagged articles (disagreement >20 points)
2. Saves to articles/sentiment/review-queue.json
3. Methods: addToQueue(), getQueue(), resolveReview()
4. Add endpoint GET /api/sentiment/review-queue"
```

### Step 10: Create Test Suite
```
PROMPT 10: "Create express-ingest/test/testSentiment.js that:
1. Tests with 5 sample articles for Danielle Smith
2. Verifies Agent 1 filters correctly
3. Verifies Agent 2 & 3 produce scores within expected ranges
4. Tests special cases: avoided answering, UCP statements
5. Outputs results to console with pass/fail status"
```

### Step 11: Add Monitoring Dashboard
```
PROMPT 11: "Add endpoint GET /api/sentiment/dashboard that returns:
1. Total articles processed per politician
2. Average stance score per politician (if multiple articles)
3. Number of flagged reviews
4. Processing statistics (agreement rate, confidence levels)
5. Last processing timestamp"
```

### Step 12: Production Deployment
```
PROMPT 12: "Create express-ingest/scripts/runSentimentAnalysis.js that:
1. Can be run via node command or scheduled job
2. Processes all politicians' articles from last 12 months
3. Logs to articles/sentiment/logs/{date}.log
4. Sends completion notification (console log for now)
5. Handles graceful shutdown on SIGTERM"
```

### Azure Portal Steps (You'll Do Manually):
1. Verify OPENAI_API_KEY is set in App Service environment variables
2. Verify ANTHROPIC_API_KEY is set as backup
3. Check AZURE_STORAGE_CONNECTION is configured
4. Monitor API usage in OpenAI dashboard
5. Set up scheduled job if needed (Azure Logic Apps or Timer Trigger)

---

## Updated Implementation Plan - 6 Consolidated Tasks

### Version 3.1 - August 31, 2025 15:38 CT

**Note**: Original 12-step plan has been consolidated into 6 logical tasks for better efficiency and testing. Each task groups related functionality and has clear deliverables.

### Task 1: Infrastructure + Agent 1 (Steps 1-2 from original plan)
**Infrastructure (Step 1):**
- ✅ **COMPLETE** - SentimentAnalyzer class created with Azure Blob Storage integration
- ✅ **COMPLETE** - OpenAI and Anthropic SDK initialization
- ✅ **COMPLETE** - Three-agent method structure implemented

**Agent 1 Implementation (Step 2):**
- **Subtask 1.1**: Create relevance gate prompt
  - Input: article text + politician name
  - Prompt: "Does this article contain any statement from [politician] about Alberta's relationship with Canada, including views on unity, separation, federalism, or independence?"
  - Output: {passed: boolean, internalScore: number, reason: string}
  - Model: GPT-5-nano (as specified in PRD)
  - Testing: Use real Danielle Smith articles from Azure to verify relevance filtering

- **Subtask 1.2**: Test relevance gate with real data
  - Load 5-10 real Danielle Smith articles from Azure Blob Storage
  - Run through Agent 1 relevance gate
  - Verify: relevant articles pass, irrelevant articles fail
  - Success criteria: >80% accuracy on relevance detection
  - Test edge cases: articles with politician mentioned but no stance

### Task 2: Scoring + Verification (Steps 3-4 from original plan)
**Agent 2 Implementation (Step 3):**
- **Subtask 2.1**: Create stance scoring prompt
  - Input: article text + politician name
  - Prompt: Score 0-100 with classification framework (0-19: Strong Sep, 20-39: Clear Sep, 40-49: Soft Sep, 50-59: Neutral, 60-69: Mod Canada, 70-89: Clear Canada, 90-100: Strong Canada)
  - Output: {stanceScore, confidence, evidence, avoidedAnswering, classification}
  - Model: GPT-5-mini (as specified in PRD)
  - Special handling: Danielle Smith UCP statements = her position

- **Subtask 2.2**: Test stance scoring accuracy
  - Use same test articles from Task 1
  - Verify scores are within expected ranges for each classification
  - Test Danielle Smith special case with UCP party statements

**Agent 3 Implementation (Step 4):**
- **Subtask 2.3**: Create verification prompt
  - Identical to Agent 2 but with different prompt wording
  - Must not see Agent 2 results (independent verification)
  - Same output structure as Agent 2

- **Subtask 2.4**: Implement score comparison logic
  - Agreement threshold: ≤20 points difference between agents
  - Final score: average if agreement, null if disagreement
  - Flag for review: disagreement >20 points
  - Review reason: "Score disagreement: X points"

**Testing Strategy:**
- Test with articles that should have clear stances
- Verify agreement/disagreement logic works correctly
- Test edge cases: avoided answering, low confidence scores
- Verify Danielle Smith special handling works

### Task 3: Storage + Processing (Steps 5-6 from original plan)
**Blob Storage Integration (Step 5):**
- **Subtask 3.1**: Implement article loading from Azure
  - Method: `loadArticlesForPolitician(politicianSlug)`
  - Path: `articles/raw/serp/{politician}/*.json`
  - Parse SERPHouse JSON responses
  - Extract article text (title + snippet combination)
  - Handle malformed JSON gracefully

- **Subtask 3.2**: Implement result storage to Azure
  - Method: `saveSentimentResult(result)`
  - Path: `articles/sentiment/{politician}/{articleHash}.json`
  - Store complete analysis results including all agent outputs
  - Include final result with classification and review flags

**Processing Script (Step 6):**
- **Subtask 3.3**: Create main processing loop
  - Load all politicians from roster (121 MLAs/MPs)
  - For each politician: load articles from blob storage
  - Process through all three agents sequentially
  - Save results to sentiment storage
  - Progress logging: "Processing {politician}: {x}/{total} articles"

- **Subtask 3.4**: Error handling + retry logic
  - Graceful failure on individual articles
  - Continue processing other articles
  - Log errors for debugging
  - No single article failure should stop entire process

**Testing Strategy:**
- Test with 5-10 real articles per politician from Azure
- Verify storage paths are correct in both directions
- Test error handling with malformed articles
- Verify processing continues despite individual failures

### Task 4: API + Batch (Steps 7-8 from original plan)
**API Endpoints (Step 7):**
- **Subtask 4.1**: POST `/api/sentiment/process`
  - Input: {politician: string, limit?: number}
  - Process articles for specific politician
  - Return: {processed: number, flagged: number, errors: array}
  - Handle both single politician and batch processing

- **Subtask 4.2**: GET `/api/sentiment/status`
  - Check processing status across all politicians
  - Return: current progress, last processed timestamp
  - Show processing statistics and completion status

**Batch Processing (Step 8):**
- **Subtask 4.3**: Implement `processAllPoliticians()`
  - Process all 121 politicians in roster
  - Configurable concurrency (default: 5 politicians at once)
  - Progress tracking saved to `articles/sentiment/progress.json`
  - Real-time progress updates during processing

- **Subtask 4.4**: Resume capability for interrupted runs
  - Check progress file on startup
  - Skip already processed politicians
  - Continue from where left off
  - Handle partial completion gracefully

**Testing Strategy:**
- Test single politician processing via API
- Test batch processing with small subset (10 politicians)
- Verify progress tracking works correctly
- Test resume functionality after interruption
- Verify API endpoints return correct data

### Task 5: Review + Monitoring (Steps 9-11 from original plan)
**Review Queue (Step 9):**
- **Subtask 5.1**: Track flagged articles for human review
  - Save to `articles/sentiment/review-queue.json`
  - Include: disagreement reason, agent scores, article details
  - Methods: `addToQueue()`, `getQueue()`, `resolveReview()`
  - Track review status and resolution notes

- **Subtask 5.2**: API endpoint for review management
  - GET `/api/sentiment/review-queue`
  - Return all flagged articles requiring human review
  - Include article context and agent disagreement details

**Test Suite (Step 10):**
- **Subtask 5.3**: Create comprehensive test suite
  - Test with 5 sample articles for Danielle Smith
  - Verify Agent 1 filters correctly (relevance gate)
  - Verify Agent 2 & 3 produce scores within expected ranges
  - Test special cases: avoided answering, UCP statements
  - Output pass/fail status with detailed results

**Monitoring Dashboard (Step 11):**
- **Subtask 5.4**: GET `/api/sentiment/dashboard`
  - Total articles processed per politician
  - Average stance score per politician (if multiple articles)
  - Number of flagged reviews requiring attention
  - Processing statistics (agreement rate, confidence levels)
  - Last processing timestamp and system status

**Testing Strategy:**
- Test review queue with articles that have score disagreements >20 points
- Verify dashboard shows correct statistics and data
- Test edge cases: no articles processed, all articles flagged
- Verify review queue management functions work correctly

### Task 6: Production (Step 12 from original plan)
**Production Script (Step 12):**
- **Subtask 6.1**: Create `runSentimentAnalysis.js` production script
  - Can be run via node command or scheduled job
  - Process all politicians' articles from last 12 months
  - Log to `articles/sentiment/logs/{date}.log`
  - Send completion notification (console log for now)
  - Handle large-scale processing efficiently

- **Subtask 6.2**: Graceful shutdown and error handling
  - Handle SIGTERM signal for clean shutdown
  - Save progress before exiting
  - Clean shutdown of Azure connections
  - Resume capability for interrupted runs

**Testing Strategy:**
- Test production script locally with small dataset
- Verify logging works correctly and creates log files
- Test graceful shutdown with SIGTERM
- Test scheduled execution (if using Azure Logic Apps)
- Verify progress saving and resume functionality

---

## Implementation Priority and Dependencies

**Task Dependencies:**
- Task 1 must complete before Task 2 (need working relevance gate)
- Task 2 must complete before Task 3 (need working agents)
- Task 3 must complete before Task 4 (need storage working)
- Task 4 can run in parallel with Task 5 (API + monitoring)
- Task 6 depends on all previous tasks being complete

**Current Status:**
- ✅ **Task 1 (Infrastructure)**: 50% complete - class structure done, Agent 1 needs implementation
- ❌ **Tasks 2-6**: Need full implementation

**Next Action:**
Complete Task 1 by implementing Agent 1 with real AI prompts, test with real Azure data, then proceed to Task 2 (Agent 2 + 3 implementation).
