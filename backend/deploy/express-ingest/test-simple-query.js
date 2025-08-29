const axios = require('axios');

// Test with a very simple query to see if the APIs are working at all
async function testSimpleQueries() {
  console.log('=== Testing Simple News Provider Queries ===');
  
  // Test NewsData.io with a simple query
  console.log('\n--- Testing NewsData.io ---');
  try {
    const newsdataResponse = await axios.get('https://newsdata.io/api/1/news', {
      params: {
        q: 'Canada',
        size: '5',
        language: 'en',
        apikey: process.env.NEWSDATAIO_API_KEY || 'test-key'
      },
      timeout: 10000
    });
    
    console.log('NewsData Response Status:', newsdataResponse.status);
    console.log('NewsData Response Data:', JSON.stringify(newsdataResponse.data, null, 2));
  } catch (error) {
    console.error('NewsData Error:', error.response?.data || error.message);
  }
  
  // Test NewsAPI with a simple query
  console.log('\n--- Testing NewsAPI ---');
  try {
    const newsapiResponse = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'Canada',
        pageSize: '5',
        language: 'en',
        apiKey: process.env.NEWS_API_KEY || 'test-key'
      },
      timeout: 10000
    });
    
    console.log('NewsAPI Response Status:', newsapiResponse.status);
    console.log('NewsAPI Response Data:', JSON.stringify(newsapiResponse.data, null, 2));
  } catch (error) {
    console.error('NewsAPI Error:', error.response?.data || error.message);
  }
}

testSimpleQueries().catch(console.error); 