const axios = require('axios');

class NewsDataClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://newsdata.io/api/1';
        this.rateLimit = {
            requestsPerDay: 200,
            requestsUsed: 0,
            lastReset: new Date().toDateString()
        };
    }

    /**
     * Search for news articles about a specific person
     * @param {string} name - Person's name to search for
     * @param {string} riding - Optional riding/constituency to narrow search
     * @param {number} windowDays - Number of days to look back (default: 7)
     * @returns {Promise<Array>} Array of normalized articles
     */
    async search(name, riding = null, windowDays = 7) {
        try {
            // Check rate limit
            this.checkRateLimit();

            // Build search query
            let query = name;
            if (riding) {
                query += ` AND (${riding} OR "Alberta")`;
            }

            // Calculate date range
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - windowDays);

            const params = {
                q: query,
                from: startDate.toISOString().split('T')[0],
                to: endDate.toISOString().split('T')[0],
                language: 'en',
                country: 'ca', // Focus on Canadian news
                category: 'politics', // Focus on political news
                apiKey: this.apiKey
            };

            console.log(`NewsData search: ${query}, ${windowDays} days`);

            const response = await axios.get(`${this.baseURL}/news`, { params });
            
            // Update rate limit
            this.rateLimit.requestsUsed++;

            if (response.data.status === 'success') {
                return this.normalizeArticles(response.data.results, name, riding);
            } else {
                throw new Error(`NewsData error: ${response.data.message || 'Unknown error'}`);
            }

        } catch (error) {
            console.error('NewsData search error:', error.message);
            throw error;
        }
    }

    /**
     * Normalize articles to consistent format
     * @param {Array} articles - Raw articles from NewsData
     * @param {string} personName - Name of person being searched
     * @param {string} riding - Riding/constituency context
     * @returns {Array} Normalized articles
     */
    normalizeArticles(articles, personName, riding) {
        return articles.map(article => ({
            id: this.generateArticleId(article.link),
            source: 'NewsData',
            url: article.link,
            title: article.title,
            publishedAt: article.pubDate,
            author: article.creator?.[0] || 'Unknown',
            snippet: article.description || article.content || '',
            person: personName,
            riding: riding,
            rawData: article // Keep original data for reference
        }));
    }

    /**
     * Generate unique ID for article
     * @param {string} url - Article URL
     * @returns {string} Unique ID
     */
    generateArticleId(url) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(url).digest('hex');
    }

    /**
     * Check if we're within rate limits
     * @throws {Error} If rate limit exceeded
     */
    checkRateLimit() {
        const today = new Date().toDateString();
        
        // Reset counter if it's a new day
        if (this.rateLimit.lastReset !== today) {
            this.rateLimit.requestsUsed = 0;
            this.rateLimit.lastReset = today;
        }

        if (this.rateLimit.requestsUsed >= this.rateLimit.requestsPerDay) {
            throw new Error(`NewsData rate limit exceeded: ${this.rateLimit.requestsPerDay} requests per day`);
        }
    }

    /**
     * Get current rate limit status
     * @returns {Object} Rate limit information
     */
    getRateLimitStatus() {
        return {
            ...this.rateLimit,
            remaining: this.rateLimit.requestsPerDay - this.rateLimit.requestsUsed
        };
    }
}

module.exports = NewsDataClient; 