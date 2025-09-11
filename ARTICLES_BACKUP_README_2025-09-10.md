# CanadaWill2 Articles Backup
**Backup Date**: September 10, 2025 21:15 CDT  
**Purpose**: Freeze article data collected from news sources for all 121 Alberta officials

## Executive Summary

This backup captures all JSON article data collected from news sources for Alberta MLAs and MPs as of September 10, 2025. The data represents the raw news articles that will be processed through the sentiment analysis pipeline to determine officials' stances on Alberta's relationship with Canada.

## Data Overview

### Source
- **Collection Method**: NewsAPI and other news sources
- **Time Period**: July 19, 2025 to September 10, 2025
- **Total Officials**: 121 (MLAs and MPs)
- **Data Format**: JSON files per official

### Data Structure
Each JSON file contains:
```json
{
  "slug": "danielle-smith",
  "name": "Danielle Smith", 
  "from": "2025-07-19",
  "newsapi": {
    "status": "ok",
    "totalResults": 44,
    "articles": [
      {
        "source": { "id": "cbc-news", "name": "CBC News" },
        "author": null,
        "title": "Judge to proceed with review of Alberta separation question",
        "description": "A judge says he must hear arguments and rule on whether a proposed referendum question on separating from Canada is constitutional...",
        "url": "https://www.cbc.ca/news/canada/edmonton/judge-to-proceed-with-review-of-alberta-separation-question-1.7608741",
        "urlToImage": "https://i.cbc.ca/1.7498540.1743461602!/cpImage/httpImage/image.jpg_gen/derivatives/16x9_1180/edmonton-courthouse.jpg",
        "publishedAt": "2025-08-14T14:12:57Z",
        "content": "A judge says he must hear arguments and rule on whether a proposed Alberta referendum question on separating from Canada is constitutional because it's important for democracy..."
      }
    ]
  }
}
```

## File Organization

### Directory Structure
```
articles-backup-2025-09-10/
├── README.md (this file)
├── articles/
│   ├── danielle-smith.json
│   ├── pat-kelly.json
│   ├── rachel-notley.json
│   └── ... (121 total files)
├── summary.json (article counts and statistics)
└── articles-backup-2025-09-10.zip (complete backup)
```

### File Naming Convention
- **Format**: `{slug}.json`
- **Examples**: 
  - `danielle-smith.json` (Premier)
  - `pat-kelly.json` (MP)
  - `rachel-notley.json` (MLA)

## Data Quality

### Coverage Statistics
- **Total Officials**: 121
- **Officials with Articles**: [To be calculated]
- **Total Articles**: [To be calculated]
- **Date Range**: July 19, 2025 - September 10, 2025
- **Average Articles per Official**: [To be calculated]

### Article Sources
- **CBC News**: Primary Canadian news source
- **Yahoo Entertainment**: Financial and political coverage
- **Other Sources**: Various Canadian and international news outlets

### Content Focus
Articles are filtered for relevance to:
- Alberta separation/independence
- Alberta-Canada relationship
- Federal-provincial relations
- Sovereignty Act discussions
- Referendum questions
- Constitutional matters

## Usage Instructions

### Restore from Backup
1. Extract `articles-backup-2025-09-10.zip`
2. Navigate to `articles/` directory
3. Process JSON files through sentiment analysis pipeline
4. Generate stance index for frontend integration

### Data Processing
1. **Load Articles**: Read JSON files for each official
2. **Extract Content**: Parse title, description, and content fields
3. **Sentiment Analysis**: Run through three-agent AI pipeline
4. **Generate Stance**: Create stance index with scores and evidence

### Integration Points
- **Sentiment Analyzer**: `src/sentiment/sentimentAnalyzer.js`
- **Stance Index**: `stances/index.json`
- **Frontend**: Public dashboard for stance display

## Technical Details

### File Format
- **Encoding**: UTF-8
- **Structure**: JSON with nested objects
- **Size**: [To be calculated] MB total
- **Compression**: ZIP format for efficient storage

### Data Validation
- **JSON Validity**: All files are valid JSON
- **Required Fields**: slug, name, from, newsapi.status, newsapi.articles
- **Article Fields**: source, title, description, url, publishedAt, content

### Backup Integrity
- **Checksums**: [To be generated]
- **File Count**: 121 JSON files
- **Verification**: All files readable and parseable

## Known Issues

### Data Gaps
- Some officials may have no articles (empty results)
- Some articles may be paywalled (limited content)
- Date ranges may vary by official

### Quality Considerations
- Article relevance varies (some may be tangentially related)
- Content length varies (some articles truncated)
- Source reliability varies by publication

## Next Steps

### Immediate Actions
1. **Process Articles**: Run through sentiment analysis pipeline
2. **Generate Stance Index**: Create `stances/index.json`
3. **Frontend Integration**: Connect to public dashboard
4. **Validation**: Verify stance accuracy for known officials

### Future Enhancements
1. **Regular Updates**: Schedule weekly article collection
2. **Quality Filtering**: Improve relevance detection
3. **Source Expansion**: Add more news sources
4. **Content Enrichment**: Add full-text scraping

## Backup Metadata

### Creation Details
- **Created**: September 10, 2025 21:15 CDT
- **Source**: `backend/_sep_out/` directory
- **Method**: ZIP compression with documentation
- **Purpose**: Stable checkpoint for article data

### Preservation
- **Storage**: Local filesystem and Git repository
- **Retention**: Permanent (historical reference)
- **Access**: Development team and stakeholders
- **Updates**: Replace with newer backups as data grows

## Contact Information

- **Project**: CanadaWill2 - Alberta Officials Stance Tracking
- **Backup Created**: September 10, 2025 21:15 CDT
- **Purpose**: Article data preservation and processing
- **Status**: Ready for sentiment analysis pipeline

---

*This backup represents a complete snapshot of news article data collected for all 121 Alberta officials, providing the foundation for the sentiment analysis and stance detection system.*


