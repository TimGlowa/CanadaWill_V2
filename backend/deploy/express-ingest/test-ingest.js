const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function testEndpoints() {
  console.log('Testing CanadaWill News Ingest API...\n');

  try {
    // Test 1: Health endpoint
    console.log('1. Testing /api/health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health endpoint:', healthResponse.data);
    console.log('');

    // Test 2: Status endpoint
    console.log('2. Testing /api/news/status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/news/status`);
    console.log('✅ Status endpoint:', JSON.stringify(statusResponse.data, null, 2));
    console.log('');

    // Test 3: Single ingest (dry run)
    console.log('3. Testing POST /api/news/ingest...');
    const ingestResponse = await axios.post(`${BASE_URL}/api/news/ingest`, {
      slug: 'jackie-lovely',
      windowDays: 3
    });
    console.log('✅ Single ingest:', JSON.stringify(ingestResponse.data, null, 2));
    console.log('');

    // Test 4: Batch ingest (dry run)
    console.log('4. Testing POST /admin/ingest/run (dry run)...');
    const batchResponse = await axios.post(`${BASE_URL}/admin/ingest/run`, {
      cohort: 'ab-all',
      windowDays: 3,
      concurrency: 5,
      dryRun: true
    });
    console.log('✅ Batch ingest (dry run):', JSON.stringify(batchResponse.data, null, 2));
    console.log('');

    console.log('🎉 All tests passed! The API is working correctly.');

  } catch (error) {
    if (error.response) {
      console.error('❌ Test failed with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('❌ Test failed:', error.message);
    }
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints }; 