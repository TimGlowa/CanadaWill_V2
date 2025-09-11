# Phase A - Relevance Screening Implementation

## Overview

This implementation provides automated relevance screening for ~170k articles using GPT-5-mini to determine if articles are about Alberta separation/unity topics and tied to specific politicians.

## Features

✅ **GPT-5-mini Integration** - Uses production GPT-5-mini model with temperature 0  
✅ **Resume Capability** - Automatically resumes from where it left off  
✅ **Status Monitoring** - Real-time progress tracking via API endpoint  
✅ **Test Mode** - Validate pipeline with small samples before full run  
✅ **Error Handling** - Robust retry logic with exponential backoff  
✅ **Output Formats** - Both CSV and JSONL output files  
✅ **KISS Design** - Simple, sequential processing with minimal complexity  

## API Endpoints

### Start Full Screening
```bash
POST /api/relevance/start
```
Runs relevance screening on all ~170k articles.

### Test Mode (Recommended First)
```bash
POST /api/relevance/test
Content-Type: application/json

{
  "limit": 10
}
```
Tests the pipeline with a small sample of articles.

### Check Status
```bash
GET /api/relevance/status
```
Returns current progress and statistics.

## Output Files

### CSV Format
**Location**: `news/analysis/master_relevance.csv`

**Headers**:
```
row_id,run_id,person_name,date,article_title,snippet,url,relevance_score,relevant,ties_to_politician,reason
```

### JSONL Format
**Location**: `news/analysis/master_relevance.jsonl`

**Schema**:
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
  "reason": "Title and snippet directly mention Alberta's political future..."
}
```

## Status Endpoint Response

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

## GPT-5-mini Prompt

The system uses this exact prompt for each article:

```
Person: {person_name}
Title: {title}
Snippet: {snippet}

Question: Is this article about Alberta separation, independence, secession, statehood (incl. '51 state'), or remaining in Canada (any stance, even dodges)? Is it tied to this politician?

Answer ONLY in JSON:
{"relevance_score":0-100,"relevant":true|false,"ties_to_politician":true|false,"reason":"30-50 words"}
```

## Row ID Format

Row IDs follow this pattern: `{slug}_{file_index}_{article_index}`

- **slug**: Politician slug from blob path (e.g., `danielle-smith`)
- **file_index**: Filename without extension (timestamp)
- **article_index**: Array index in the JSON's raw[] array

Example: `danielle-smith_20250909T225609Z_42`

## Error Handling

- **GPT API Failures**: Retry up to 2 times with exponential backoff
- **Parse Errors**: Log and skip article, continue processing
- **Blob Access Issues**: Log error and continue with next file
- **Resume Logic**: Skip already processed articles automatically

## Testing

### Quick Test
```bash
# Test with 10 articles
curl -X POST http://localhost:8080/api/relevance/test \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

### Full Test Script
```bash
# Run comprehensive test
node test-relevance.js
```

## Environment Variables Required

- `OPENAI_API_KEY` - For GPT-5-mini access
- `AZURE_STORAGE_CONNECTION` - For blob storage access
- `ARTICLES_CONTAINER` - Blob container name (default: 'articles')

## File Structure

```
backend/express-ingest/
├── src/relevance/
│   └── relevanceScreener.js    # Main screening logic
├── test-relevance.js           # Test script
├── relevance_status.json       # Status file (auto-created)
└── PHASE_A_README.md          # This documentation
```

## Usage Workflow

1. **Test First** (Recommended):
   ```bash
   curl -X POST http://localhost:8080/api/relevance/test -H "Content-Type: application/json" -d '{"limit": 10}'
   ```

2. **Check Test Results**:
   ```bash
   curl http://localhost:8080/api/relevance/status
   ```

3. **Run Full Screening** (if test successful):
   ```bash
   curl -X POST http://localhost:8080/api/relevance/start
   ```

4. **Monitor Progress**:
   ```bash
   curl http://localhost:8080/api/relevance/status
   ```

## Performance Expectations

- **Test Mode** (10 articles): ~30-60 seconds
- **Full Mode** (~170k articles): ~8-12 hours
- **GPT-5-mini Rate Limits**: Handled with exponential backoff
- **Memory Usage**: Minimal - streams files one at a time

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure `OPENAI_API_KEY` and `AZURE_STORAGE_CONNECTION` are set

2. **GPT-5-mini Access**
   - Verify API key has access to GPT-5-mini model
   - Check rate limits and quotas

3. **Blob Storage Access**
   - Verify connection string and container permissions
   - Ensure blob files exist at `news/raw/serp/*/*.json`

4. **Resume Issues**
   - Check if output files exist and are accessible
   - Verify row_id format matches expected pattern

### Debug Commands

```bash
# Check service health
curl http://localhost:8080/api/health

# Check current status
curl http://localhost:8080/api/relevance/status

# View available routes
curl http://localhost:8080/unknown-route
```

## Next Steps

After Phase A completes successfully:

1. **Phase B**: Full-text fetching for relevant articles
2. **Phase C**: Stance classification using three-agent system
3. **Integration**: Connect results to frontend dashboard

## KISS Principles Applied

- ✅ Single purpose: Only relevance screening
- ✅ Sequential processing: No complex parallelization
- ✅ Simple file formats: CSV + JSONL
- ✅ Clear error handling: Log and continue
- ✅ Resume capability: Skip processed articles
- ✅ Status monitoring: Simple JSON file
- ✅ Test mode: Validate before full run
