/**
 * News API Configuration
 * Loads environment variables for NewsAPI.org and NewsData.io
 */

function getNewsConfig() {
    const newsApiKey = process.env.NEWS_API_KEY;
    const newsDataIoKey = process.env.NEWSDATAIO_API_KEY;

    if (!newsApiKey) {
        console.warn('NEWS_API_KEY not found in environment variables');
    }

    if (!newsDataIoKey) {
        console.warn('NEWSDATAIO_API_KEY not found in environment variables');
    }

    return {
        newsApi: {
            apiKey: newsApiKey,
            enabled: !!newsApiKey,
            rateLimit: {
                requestsPerDay: 100,
                description: 'NewsAPI.org allows 100 requests per day'
            }
        },
        newsData: {
            apiKey: newsDataIoKey,
            enabled: !!newsDataIoKey,
            rateLimit: {
                requestsPerDay: 200,
                description: 'NewsData.io allows 200 requests per day'
            }
        },
        // Combined rate limit info
        totalRequestsPerDay: (newsApiKey ? 100 : 0) + (newsDataIoKey ? 200 : 0),
        enabled: !!(newsApiKey || newsDataIoKey)
    };
}

module.exports = { getNewsConfig }; 