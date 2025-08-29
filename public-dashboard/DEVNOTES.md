# CanadaWill Frontend Development Notes

## API Architecture

### Coordinate-Based Representative Lookup

The frontend uses a coordinate-based approach for representative lookups:

**Flow**: Address → geocode to coordinates → call `/api/v1/politicians/candidates/coordinates/:lat/:lng`

**Primary Contract**: `GET {VITE_API_BASE_URL}/api/v1/politicians/candidates/coordinates/{lat}/{lng}`

**Benefits**:
- More accurate than postal code lookups
- Handles edge cases where postal codes span multiple ridings
- Supports precise location-based queries
- Battle River–Crowfoot injection triggers when that riding is detected

### API Configuration

The frontend uses a centralized API configuration:

- **Environment Variable**: `VITE_API_BASE_URL`
- **Fallback**: `http://localhost:8080/api/v1` (development)
- **Production Default**: `https://canadawill-api2.azurewebsites.net/api/v1`

### Error Handling

**Coordinate Validation Errors**: 
- Shows: "Could not locate that point. Please adjust the map pin or try a nearby address."
- Logs raw error in development only

**Other Errors**:
- Timeout: "Request timed out. Please try again."
- 404: "No representatives found for this location."
- 500: "Server error. Please try again later."

### Caching

- **Duration**: 5 minutes
- **Cache Keys**: Based on request parameters
- **Cache Management**: Automatic cleanup and statistics

## Development Workflow

1. **Local Development**: Uses `http://localhost:8080/api/v1` by default
2. **Environment Variables**: Set `VITE_API_BASE_URL` for custom endpoints
3. **Error Logging**: Raw errors logged only in development mode
4. **Production**: No console spam, user-friendly error messages only

## API Endpoints Used

- `GET /api/v1/politicians/candidates/coordinates/:lat/:lng` (Primary)
- `GET /api/v1/politicians` (List with filtering)
- `GET /api/v1/politicians/:id` (Individual politician)
- `GET /api/v1/politicians/:id/stance-history` (Stance history)
- `GET /api/v1/health` (Health check)

## Battle River-Crowfoot Special Handling

When coordinates fall within the Battle River-Crowfoot riding:
- Backend automatically injects by-election candidates
- Frontend displays both elected officials and candidates
- Special UI indicators for by-election candidates 