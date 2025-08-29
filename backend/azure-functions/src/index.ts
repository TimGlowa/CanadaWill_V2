import { app } from '@azure/functions';

// Import function handlers
import './functions/healthCheck';
import './functions/newsIngest';

// Note: No staticFiles import to avoid catch-all registration 