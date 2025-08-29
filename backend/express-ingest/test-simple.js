console.log('Testing module loading...');

try {
  console.log('1. Testing newsRoutes import...');
  const newsRoutes = require('./dist/routes/newsRoutes').default;
  console.log('✅ newsRoutes loaded successfully');
  
  console.log('2. Testing orchestrator import...');
  const { IngestOrchestrator } = require('./dist/ingest/orchestrator');
  console.log('✅ IngestOrchestrator loaded successfully');
  
  console.log('3. Testing orchestrator instantiation...');
  const orchestrator = new IngestOrchestrator();
  console.log('✅ IngestOrchestrator instantiated successfully');
  
  console.log('4. Testing status method...');
  const status = orchestrator.getStatus();
  console.log('✅ Status method works:', status);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
} 