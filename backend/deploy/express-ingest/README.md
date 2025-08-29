# Express Ingest API

Simple Express API to replace broken Azure Functions.

## Deployment lockpoint (20250817T2351Z UTC)

**Prod host:** https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net

### Health
```bash
curl -fsS "https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/health"
```

### NewsData.io
```bash
curl -fsS "https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/newsdata?q=bitcoin&size=3&removeduplicate=1"
```

### NewsAPI.org
```bash
curl -fsS "https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/newsapi/top-headlines?q=bitcoin&language=en&pageSize=3"
```

### Required App Settings (Azure)
- NEWSDATAIO_API_KEY (used)
- NEWS_API_KEY (used)

Notes: Node 20, Express, port 8080. Routes mounted under `/api`. 