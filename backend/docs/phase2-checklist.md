# Phase 2 Verification Checklist

**Generated:** 2025-08-13 01:15 CT

## Overview
This checklist verifies that Phase 2 of the CanadaWill political stance analysis system is working correctly. Phase 2 implements the core infrastructure for collecting, processing, and analyzing political stance data from news sources.

## Verification Steps

### 1. API Keys Present ✅
- [ ] **NEWS_API_KEY** present in Azure App Settings
- [ ] **NEWSDATAIO_API_KEY** present in Azure App Settings
- [ ] Both keys are valid and have sufficient quota remaining

**Verification Method:** Check Azure Portal → CanadaWill-api3-dzeqebevgsb2gxf8.canadacentral-01.azurewebsites.net → Configuration → Application settings

Note: Migrated from Azure Functions to Express API

**Expected Result:** Both environment variables are visible and contain valid API keys

---

### 2. Blob Storage Containers Present ✅
- [ ] **articles** container exists in canadawillfuncstore2
- [ ] **quotes** container exists in canadawillfuncstore2
- [ ] Both containers are accessible and writable

**Verification Method:** Azure Portal → Storage Account → Containers

**Expected Result:** Two containers visible: "articles" and "quotes"

---

### 3. HTTP Readers Working ✅
- [ ] **GET /api/articles?name=eric-bouchard** returns valid response
- [ ] **GET /api/quotes?name=eric-bouchard** returns valid response
- [ ] Both endpoints return CORS headers and proper JSON

**Verification Method:** Azure Portal → CanadaWill-api3-dzeqebevgsb2gxf8.canadacentral-01.azurewebsites.net → /articles

Note: Migrated from Azure Functions to Express API

**Test Body:** None (GET request)
**Expected Result:** 200 response with JSON containing person, count, and articles/quotes arrays

---

### 4. runOnceHttp Tested ✅
- [ ] **POST /api/runOnceHttp** executes successfully
- [ ] News API calls complete without errors
- [ ] Articles are stored to blob storage
- [ ] Metrics are logged to App Insights

**Verification Method:** Azure Portal → CanadaWill-api3-dzeqebevgsb2gxf8.canadacentral-01.azurewebsites.net → /runOnceHttp

Note: Migrated from Azure Functions to Express API

**Test Body:**
```json
{
  "mode": "deep",
  "targetsSource": "test12", 
  "windowDays": 60
}
```

**Expected Result:** 200 response with execution summary, counts, and sample blob paths

---

### 5. Metrics Visible in App Insights ✅
- [ ] News fetch execution logs visible
- [ ] Person counts and timing data recorded
- [ ] Error logs (if any) properly formatted

**Verification Method:** Azure Portal → CanadaWill-api3-dzeqebevgsb2gxf8.canadacentral-01.azurewebsites.net → Monitoring → Application Insights → Logs

Note: Migrated from Azure Functions to Express API

**Query:** `traces | where message contains "News fetch" | order by timestamp desc`

**Expected Result:** Recent log entries showing fetch metrics and execution times

---

## Success Criteria

Phase 2 is considered **VERIFIED** when:
- ✅ All 5 verification steps pass
- ✅ At least 2-3 blob paths are visible for different people
- ✅ No critical errors in execution logs
- ✅ API responses contain expected data structure

## Owner Sign-off

**Date:** _______________
**Owner:** _______________
**Status:** ☐ VERIFIED ☐ NEEDS FIXES

**Notes:** _______________

---

## Next Steps After Verification

Once Phase 2 is verified:
1. **Task 3**: Expand to full news data collection (30-90 days historical)
2. **Task 4**: Implement Twitter integration for social media analysis  
3. **Task 5**: Set up email survey integration with Apollo
4. **Task 6**: Scale to full Alberta coverage (400+ politicians)

## Troubleshooting

### Common Issues
- **API Key Errors**: Check environment variables in Azure App Settings
- **Blob Storage Errors**: Verify connection string and container permissions
- **Function Timeouts**: Check execution time limits and API response times
- **CORS Issues**: Verify function.json CORS configuration

### Support
- Check Azure Function logs for detailed error messages
- Verify all environment variables are properly configured
- Test individual components before running full integration 