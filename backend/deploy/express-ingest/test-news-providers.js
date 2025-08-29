const axios = require('axios');

// Test NewsData.io API
async function testNewsData() {
  console.log('=== Testing NewsData.io API ===');
  
  const apiKey = process.env.NEWSDATAIO_API_KEY;
  if (!apiKey) {
    console.log('NEWSDATAIO_API_KEY not set');
    return;
  }
  
  console.log('API Key:', apiKey.substring(0, 8) + '...');
  
  try {
    // Test with Michelle Rempel Garner
    const searchParams = new URLSearchParams({
      q: 'Michelle Rempel Garner OR "M. Rempel Garner" OR "Rempel Garner, Michelle" OR Calgary OR "Calgary Nose Hill"',
      from: '2024-07-17', // 30 days ago
      to: '2025-08-17',   // today
      size: '10',
      language: 'en',
      apikey: apiKey
    });
    
    console.log('Query:', searchParams.toString());
    
    const response = await axios.get(`https://newsdata.io/api/1/news?${searchParams}`);
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('NewsData error:', error.response?.data || error.message);
  }
}

// Test NewsAPI
async function testNewsAPI() {
  console.log('\n=== Testing NewsAPI ===');
  
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    console.log('NEWS_API_KEY not set');
    return;
  }
  
  console.log('API Key:', apiKey.substring(0, 8) + '...');
  
  try {
    // Test with Michelle Rempel Garner
    const searchParams = new URLSearchParams({
      q: 'Michelle Rempel Garner OR "M. Rempel Garner" OR "Rempel Garner, Michelle" OR Calgary OR "Calgary Nose Hill"',
      from: '2024-07-17', // 30 days ago
      to: '2025-08-17',   // today
      sortBy: 'publishedAt',
      pageSize: '10',
      language: 'en',
      apiKey: apiKey
    });
    
    console.log('Query:', searchParams.toString());
    
    const response = await axios.get(`https://newsapi.org/v2/everything?${searchParams}`);
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('NewsAPI error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testNewsData();
  await testNewsAPI();
}

runTests().catch(console.error); 