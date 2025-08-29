# Storage Contract - CanadaWill News Ingest

This document defines the storage schema and data contracts for the news ingestion system. **Breaking changes to this schema require explicit sign-off.**

## Container: `articles`

All data is stored in the `articles` container within the Azure Storage Account `canadawillfuncstore2`.

## Data Prefixes

### 1. Raw Provider Responses: `ingest/`

**Purpose**: Store complete, unmodified responses from news providers for audit and debugging.

**Path Structure**:
```
ingest/YYYY/MM/DD/slug/source/timestamp.json
```

**Components**:
- `YYYY`: 4-digit year
- `MM`: 2-digit month (01-12)
- `DD`: 2-digit day (01-31)
- `slug`: Person identifier (e.g., "jackie-lovely")
- `source`: Provider name ("newsapi" or "newsdata")
- `timestamp`: ISO timestamp with colons/dots replaced by hyphens

**Examples**:
```
ingest/2025/01/15/jackie-lovely/newsapi/2025-01-15T22-30-00-000Z.json
ingest/2025/01/15/danielle-smith/newsdata/2025-01-15T22-35-00-000Z.json
```

**Content**: Complete provider API response (JSON format)
- NewsAPI: Full response with articles array
- NewsData: Full response with results array
- Includes all metadata, pagination, and provider-specific fields

### 2. Summary Files: `index/`

**Purpose**: Store per-run summaries for each person, enabling quick analysis and monitoring.

**Path Structure**:
```
index/slug/YYYY/MM/DD/runId.summary.json
```

**Components**:
- `slug`: Person identifier
- `YYYY/MM/DD`: Date of the ingest run
- `runId`: Unique identifier for the ingest run (ISO timestamp format)

**Examples**:
```
index/jackie-lovely/2025/01/15/2025-01-15T22-30-00-000Z.summary.json
index/danielle-smith/2025/01/15/2025-01-15T22-35-00-000Z.summary.json
```

**Content**: IngestSummary object with the following structure:

```typescript
interface IngestSummary {
  runId: string;                    // Unique run identifier
  slug: string;                     // Person slug
  windowDays: number;               // Search window in days
  counts: {
    requested: number;              // Number of requests made
    normalized: number;             // Total articles found
    newSaved: number;               // New unique articles saved
    dupSkipped: number;             // Duplicate articles skipped
  };
  sources: {
    newsapi: {
      requests: number;              // API calls made to NewsAPI
      normCount: number;            // Articles normalized from NewsAPI
    };
    newsdata: {
      requests: number;              // API calls made to NewsData
      normCount: number;            // Articles normalized from NewsData
    };
  };
  startedAt: string;                // ISO timestamp when ingest started
  finishedAt: string;               // ISO timestamp when ingest completed
  errors: string[];                 // Array of error messages (if any)
}
```

## Data Normalization

### Article Normalization

All articles are normalized to a consistent format regardless of source:

```typescript
interface NormalizedArticle {
  id: string;                       // SHA1 hash of URL (lowercase)
  url: string;                      // Original article URL
  title: string;                    // Article title
  source: 'newsapi' | 'newsdata';  // Source provider
  publishedAt: string;              // ISO timestamp
  author: string | null;            // Author name or null
  snippet: string | null;           // Article description/snippet
  personSlug: string;               // Associated person slug
  providerMeta: {                   // Provider-specific metadata
    rawId: string;                  // Original provider ID
    sourceName?: string;            // NewsAPI source name
    sourceId?: string;              // NewsData source ID
    sourceUrl?: string;             // NewsData source URL
    urlToImage?: string | null;     // NewsAPI image URL
    imageUrl?: string | null;       // NewsData image URL
  };
}
```

### Deduplication Strategy

1. **Primary Key**: URL (case-insensitive)
2. **Fallback Key**: `lower(title) + publishedAt` (if URL deduplication fails)
3. **Scope**: Per-person, per-run (not cross-person or cross-run)

## Retention and Cleanup

- **Raw responses**: Keep indefinitely for audit purposes
- **Summary files**: Keep indefinitely for historical analysis
- **No automatic deletion** - manual cleanup only with explicit approval

## Access Patterns

### Read Operations
- **Status queries**: Read summary files to get ingest statistics
- **Debugging**: Read raw responses to troubleshoot provider issues
- **Analytics**: Aggregate summary files for trend analysis

### Write Operations
- **Ingest runs**: Write raw responses and summaries atomically
- **Updates**: Summary files are immutable - new runs create new files

## Error Handling

- **Storage failures**: Retry with exponential backoff (3 attempts)
- **Partial writes**: Summary files include error arrays for failed operations
- **Corruption**: Raw responses preserved even if summary generation fails

## Monitoring and Validation

- **Blob count**: Monitor total files in each prefix
- **File sizes**: Raw responses typically 10-100KB, summaries 1-5KB
- **Access patterns**: Track read/write operations for performance analysis

## Schema Evolution

### Adding New Fields
- **Safe**: Adding optional fields to existing interfaces
- **Requires migration**: Adding required fields or changing field types
- **Breaking changes**: Modifying existing field semantics

### Versioning Strategy
- **Current version**: v1.0 (this document)
- **Future versions**: Increment major version for breaking changes
- **Migration path**: Document required for any schema changes

## Compliance and Security

- **Data privacy**: No PII stored beyond what's in public news articles
- **Access control**: Azure Storage account-level permissions
- **Audit trail**: All operations logged with timestamps and runIds
- **Encryption**: Azure Storage default encryption at rest and in transit 