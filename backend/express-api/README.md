# CanadaWill Express API - News Scraping

This Express API provides news scraping functionality for political stance analysis using NewsAPI.org and NewsData.io.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory with:

```bash
# NewsAPI.org - Get your key from https://newsapi.org/
NEWS_API_KEY=your_newsapi_key_here

# NewsData.io - Get your key from https://newsdata.io/
NEWSDATAIO_API_KEY=your_newsdata_key_here

# Azure Storage Connection String (already configured)
AZURE_STORAGE_CONNECTION=your_azure_storage_connection_string

# Server Port (optional, defaults to 8080)
PORT=8080
```

### 3. Run the API
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## News API Endpoints

### GET `/api/v1/news/status`
Get status of news API services and rate limits.

### POST `/api/v1/news/search`
Search for news articles about a specific person.

**Request Body:**
```json
{
  "name": "Danielle Smith",
  "riding": "Brooks-Medicine Hat",
  "windowDays": 30,
  "pageSize": 100
}
```

### GET `/api/v1/news/test`
Test endpoint to verify news API clients are working.

## Testing

### Test News API Clients
```bash
node test-news-apis.js
```

This will test both NewsAPI.org and NewsData.io clients with a simple "Alberta" search.

### Test Express Endpoints
```bash
# Test status endpoint
curl http://localhost:8080/api/v1/news/status

# Test search endpoint
curl -X POST http://localhost:8080/api/v1/news/search \
  -H "Content-Type: application/json" \
  -d '{"name": "Danielle Smith", "windowDays": 7}'
```

## Rate Limits

- **NewsAPI.org**: 100 requests per day
- **NewsData.io**: 200 requests per day
- **Total**: 300 requests per day when both are configured

## Architecture

- **NewsAPIClient**: Handles NewsAPI.org integration
- **NewsDataClient**: Handles NewsData.io integration  
- **newsRoutes**: Express routes for news endpoints
- **newsConfig**: Configuration and environment variable management

## Next Steps

1. ✅ News API clients implemented
2. ✅ Express endpoints created
3. ✅ Basic testing framework
4. 🔄 Add article storage to blob storage
5. 🔄 Implement sentiment analysis
6. 🔄 Add politician list and batch processing # Test comment
