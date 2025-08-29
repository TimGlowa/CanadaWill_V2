import { HttpRequest, HttpResponseInit, app } from '@azure/functions';
import { azureStorageService } from '../services/azureStorageService';

app.http('storageHealth', {
  methods: ['GET'],
  authLevel: 'function',
  handler: async (_request: HttpRequest): Promise<HttpResponseInit> => {
    try {
      // Call the health check method
      const healthResult = await azureStorageService.healthCheck();
      
      if (healthResult.ok) {
        return {
          status: 200,
          body: JSON.stringify(healthResult),
          headers: {
            'Content-Type': 'application/json'
          }
        };
      } else {
        return {
          status: 500,
          body: JSON.stringify(healthResult),
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Storage health check failed:', error);
      
      return {
        status: 500,
        body: JSON.stringify({
          ok: false,
          error: errorMessage,
          stage: 'functionExecution'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
    }
  }
}); 