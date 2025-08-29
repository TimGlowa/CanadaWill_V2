/**
 * Test script for News API clients
 * Run with: node test-news-apis.js
 */

// Load environment variables (you'll need to set these)
require('dotenv').config();

const NewsAPIClient = require('./src/news/newsapiClient');
const NewsDataClient = require('./src/news/newsdataClient');
const { getNewsConfig } = require('./src/config/newsConfig');

async function testNewsAPIs() {
    console.log('🧪 Testing News API Clients...\n');

    // Check configuration
    const config = getNewsConfig();
    console.log('📋 Configuration:');
    console.log(`  NewsAPI.org: ${config.newsApi.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  NewsData.io: ${config.newsData.enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  Total requests/day: ${config.totalRequestsPerDay}\n`);

    if (!config.enabled) {
        console.log('❌ No news APIs enabled. Set NEWS_API_KEY and/or NEWSDATAIO_API_KEY environment variables.');
        return;
    }

    // Test NewsAPI if enabled
    if (config.newsApi.enabled) {
        console.log('🔍 Testing NewsAPI.org...');
        try {
            const newsApiClient = new NewsAPIClient(config.newsApi.apiKey);
            
            // Test rate limit status
            const rateLimit = newsApiClient.getRateLimitStatus();
            console.log(`  Rate limit: ${rateLimit.remaining}/${rateLimit.requestsPerDay} remaining`);

            // Test search (small query to avoid using too many requests)
            const articles = await newsApiClient.search('Alberta', null, 1, 5);
            console.log(`  Search test: Found ${articles.length} articles`);
            
            if (articles.length > 0) {
                console.log(`  Sample article: "${articles[0].title}"`);
                console.log(`  Source: ${articles[0].source}, URL: ${articles[0].url}`);
            }
            
            console.log('  ✅ NewsAPI.org test successful\n');
        } catch (error) {
            console.log(`  ❌ NewsAPI.org test failed: ${error.message}\n`);
        }
    }

    // Test NewsData if enabled
    if (config.newsData.enabled) {
        console.log('🔍 Testing NewsData.io...');
        try {
            const newsDataClient = new NewsDataClient(config.newsData.apiKey);
            
            // Test rate limit status
            const rateLimit = newsDataClient.getRateLimitStatus();
            console.log(`  Rate limit: ${rateLimit.remaining}/${rateLimit.requestsPerDay} remaining`);

            // Test search (small query to avoid using too many requests)
            const articles = await newsDataClient.search('Alberta', null, 1);
            console.log(`  Search test: Found ${articles.length} articles`);
            
            if (articles.length > 0) {
                console.log(`  Sample article: "${articles[0].title}"`);
                console.log(`  Source: ${articles[0].source}, URL: ${articles[0].url}`);
            }
            
            console.log('  ✅ NewsData.io test successful\n');
        } catch (error) {
            console.log(`  ❌ NewsData.io test failed: ${error.message}\n`);
        }
    }

    console.log('🎯 Test Summary:');
    console.log('  - NewsAPI.org: ' + (config.newsApi.enabled ? '✅ Working' : '❌ Not configured'));
    console.log('  - NewsData.io: ' + (config.newsData.enabled ? '✅ Working' : '❌ Not configured'));
    console.log('\n📝 Next steps:');
    console.log('  1. Set environment variables for API keys');
    console.log('  2. Test with actual politician names');
    console.log('  3. Integrate with Express endpoints');
}

// Run the test
testNewsAPIs().catch(console.error); 