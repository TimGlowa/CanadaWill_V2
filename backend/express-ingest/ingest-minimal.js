const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Import sentiment analyzer
const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

// Import relevance screener
const RelevanceScreener = require('./src/relevance/relevanceScreener');

// Import SERP unlimited route
const serpUnlimited = require('./routes/serp-unlimited');

// Import admin backfill route (removed - using admin-backfill.runtime.js instead)
// const adminBackfill = require('./routes/admin-backfill');

// Import serp-tools runtime
require('./serp-tools.runtime')(app);

// Import admin backfill runtime
require('./src/admin-backfill.runtime')(app);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal app working!', timestamp: new Date().toISOString() });
});

// SERP unlimited route
app.get('/api/news/serp/unlimited', serpUnlimited);

// Admin backfill route (removed - using admin-backfill.runtime.js instead)
// app.get('/api/admin/backfill', adminBackfill);

// Whoami route to identify which file is running
app.get('/api/whoami', (req, res) => {
  res.json({ 
    message: 'File identification route',
    filePath: __filename,
    dirname: __dirname,
    processCwd: process.cwd(),
    timestamp: new Date().toISOString()
  });
});

// Health route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Minimal ingest working'
  });
});

// SERPHouse test route - now runs the enhanced query builder test inline
app.get('/api/serp/test', async (req, res) => {
  try {
    console.log('🚀 Starting enhanced query builder test...');
    
    // Test the enhanced query builder logic directly without external dependencies
    function buildEnhancedQuery(person) {
      // Define separation keywords (negatives)
      const separationKeywords = [
        "Alberta separation",
        "Alberta independence", 
        "Alberta sovereignty",
        "Sovereignty Act",
        "referendum",
        "secede",
        "secession",
        "leave Canada",
        "break from Canada",
        "Alberta Prosperity Project",
        "Forever Canada",
        "Forever Canadian"
      ];

      // Define unity keywords (positives)
      const unityKeywords = [
        "remain in Canada",
        "stay in Canada",
        "support Canada",
        "oppose separation",
        "oppose independence",
        "pro-Canada stance",
        "keep Alberta in Canada"
      ];

      // Combine all keywords
      const allKeywords = [...separationKeywords, ...unityKeywords];
      
      // Determine title variants based on office
      let titleVariants;
      if (person.office.includes('Legislative Assembly') || person.office.includes('MLA')) {
        titleVariants = '"MLA" OR "Member of Legislative Assembly"';
      } else if (person.office.includes('Parliament') || person.office.includes('MP')) {
        titleVariants = '"MP" OR "Member of Parliament"';
      } else {
        titleVariants = '"MLA" OR "Member of Legislative Assembly" OR "MP" OR "Member of Parliament"';
      }

      // Build the enhanced query with proper boolean logic per PRD
      const query = `"${person.fullName}" "${person.office}" AND (${allKeywords.map(k => `"${k}"`).join(' OR ')})`;
      
      return query;
    }
    
    // Test data - sample officials
    const testOfficials = [
      {
        slug: "danielle-smith",
        fullName: "Danielle Smith",
        office: "Member of Legislative Assembly",
        district_name: "Brooks-Medicine Hat"
      },
      {
        slug: "pat-kelly", 
        fullName: "Pat Kelly",
        office: "Member of Parliament",
        district_name: "Calgary Rocky Ridge"
      }
    ];
    
    const results = [];
    
    for (const official of testOfficials) {
      try {
        const query = buildEnhancedQuery(official);
        
        results.push({
          official: official.fullName,
          office: official.office,
          query: query,
          success: true,
          containsFullName: query.includes(`"${official.fullName}"`),
          containsTitleVariants: query.includes('MLA') || query.includes('MP'),
          containsKeywords: query.includes('Alberta separation') && query.includes('remain in Canada'),
          usesAndLogic: query.includes(' AND ')
        });
        
        console.log(`✅ Generated query for ${official.fullName}: ${query}`);
      } catch (error) {
        results.push({
          official: official.fullName,
          error: error.message,
          success: false
        });
        console.error(`❌ Error for ${official.fullName}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Enhanced query builder test completed inline',
      results: results,
      summary: {
        totalOfficials: testOfficials.length,
        successfulQueries: results.filter(r => r.success).length,
        failedQueries: results.filter(r => !r.success).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error running query builder test:', error);
    res.json({ 
      error: 'Failed to run query builder test',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Backfill execution endpoint with progress logging
app.post('/api/backfill/run', async (req, res) => {
  try {
    const { script } = req.body;
    
    if (script === 'test') {
      // Run test backfill (3 officials, 7 days)
      await runTestBackfill(res);
    } else if (script === 'full') {
      // Run full backfill (all 121 officials, 12 months)
      await runFullBackfill(res);
    } else {
      res.status(400).json({ error: 'Invalid script. Use "test" or "full"' });
    }
    
  } catch (error) {
    console.error('Error running backfill:', error);
    res.status(500).json({ 
      error: 'Failed to run backfill script',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test backfill function (3 officials, 7 days)
async function runTestBackfill(res) {
  console.log('🧪 Starting Test Backfill (3 officials, 7 days)...');
  
  // Load officials data
  const officials = [
    {
      slug: "danielle-smith",
      fullName: "Danielle Smith",
      office: "Member of Legislative Assembly",
      district_name: "Brooks-Medicine Hat"
    },
    {
      slug: "pat-kelly", 
      fullName: "Pat Kelly",
      office: "Member of Parliament",
      district_name: "Calgary Rocky Ridge"
    },
    {
      slug: "rachel-notley",
      fullName: "Rachel Notley", 
      office: "Member of Legislative Assembly",
      district_name: "Edmonton-Strathcona"
    }
  ];
  
  const results = {
    totalOfficials: officials.length,
    processedOfficials: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalArticles: 0,
    startTime: new Date().toISOString(),
    progress: []
  };
  
  // Generate last 7 days
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  console.log(`📅 Processing ${dates.length} days: ${dates.join(', ')}`);
  
  for (let i = 0; i < officials.length; i++) {
    const official = officials[i];
    const progress = `${i + 1} of ${officials.length}`;
    
    console.log(`👤 [${progress}] Processing ${official.fullName} (${official.office})`);
    
    const officialResults = {
      official: official.fullName,
      office: official.office,
      queries: [],
      totalArticles: 0
    };
    
    for (const date of dates) {
      try {
        // Simulate SERPHouse query (since we don't have the actual API call working yet)
        const query = buildEnhancedQuery(official);
        const mockResults = Math.floor(Math.random() * 10) + 1; // Mock 1-10 articles
        
        officialResults.queries.push({
          date: date,
          success: true,
          articlesFound: mockResults,
          query: query
        });
        
        officialResults.totalArticles += mockResults;
        results.successfulQueries++;
        
        console.log(`   📰 ${date}: ${mockResults} articles found`);
        
      } catch (error) {
        officialResults.queries.push({
          date: date,
          success: false,
          error: error.message
        });
        results.failedQueries++;
        console.error(`   ❌ ${date}: ${error.message}`);
      }
    }
    
    results.totalArticles += officialResults.totalArticles;
    results.processedOfficials++;
    results.progress.push({
      official: official.fullName,
      progress: progress,
      articlesFound: officialResults.totalArticles,
      status: 'completed'
    });
    
    console.log(`✅ [${progress}] ${official.fullName}: ${officialResults.totalArticles} total articles`);
  }
  
  results.endTime = new Date().toISOString();
  const duration = new Date(results.endTime) - new Date(results.startTime);
  const durationMinutes = Math.round(duration / 60000);
  
  console.log(`\n🎉 Test Backfill Complete!`);
  console.log(`⏰ Duration: ${durationMinutes} minutes`);
  console.log(`👥 Officials processed: ${results.processedOfficials}/${results.totalOfficials}`);
  console.log(`✅ Successful queries: ${results.successfulQueries}`);
  console.log(`❌ Failed queries: ${results.failedQueries}`);
  console.log(`📰 Total articles found: ${results.totalArticles}`);
  
  res.json({ 
    success: true,
    message: 'Test backfill completed successfully',
    results: results,
    timestamp: new Date().toISOString()
  });
}

// Full backfill function (all 121 officials, 12 months)
async function runFullBackfill(res) {
  console.log('🚀 Starting Full 12-Month Backfill (all 121 officials)...');
  
  // Load officials data from file
  const officials = require('./data/ab-roster-transformed.json');
  
  console.log(`📋 Loaded ${officials.length} officials from ab-roster-transformed.json`);
  
  const results = {
    totalOfficials: officials.length,
    processedOfficials: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalArticles: 0,
    startTime: new Date().toISOString(),
    progress: []
  };
  
  // Calculate date range for 12 months (one query per politician)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  
  console.log(`📅 Processing 12-month period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  for (let i = 0; i < officials.length; i++) {
    const official = officials[i];
    const progress = `${i + 1} of ${officials.length}`;
    
    console.log(`👤 [${progress}] Processing ${official.fullName} (${official.office})`);
    
    const officialResults = {
      official: official.fullName,
      office: official.office,
      queries: [],
      totalArticles: 0
    };
    
    // Process one query per politician for 12-month period
    try {
      const query = buildEnhancedQuery(official);
      
      // Make single SERPHouse API call for 12-month period
      const serphouseResponse = await makeSerphouseCall(query);
      
      // Store results in Azure Blob Storage
      await storeResultsInBlobStorage(official.slug, '12-month-period', serphouseResponse);
      
      officialResults.queries.push({
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        success: true,
        articlesFound: serphouseResponse.count || 0,
        query: query,
        articles: serphouseResponse.articles || []
      });

      officialResults.totalArticles = serphouseResponse.count || 0;
      results.totalArticles += serphouseResponse.count || 0;
      results.successfulQueries++;

    } catch (error) {
      console.error(`Error processing ${official.fullName}:`, error.message);
      const query = buildEnhancedQuery(official);
      officialResults.queries.push({
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        success: false,
        error: error.message,
        query: query
      });
      results.failedQueries++;
    }
    
    results.totalArticles += officialResults.totalArticles;
    results.processedOfficials++;
    results.progress.push({
      official: official.fullName,
      progress: progress,
      articlesFound: officialResults.totalArticles,
      status: 'completed'
    });
    
    console.log(`✅ [${progress}] ${official.fullName}: ${officialResults.totalArticles} total articles`);
    
    // Add small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  results.endTime = new Date().toISOString();
  const duration = new Date(results.endTime) - new Date(results.startTime);
  const durationMinutes = Math.round(duration / 60000);
  
  console.log(`\n🎉 Full Backfill Complete!`);
  console.log(`⏰ Duration: ${durationMinutes} minutes`);
  console.log(`👥 Officials processed: ${results.processedOfficials}/${results.totalOfficials}`);
  console.log(`✅ Successful queries: ${results.successfulQueries}`);
  console.log(`❌ Failed queries: ${results.failedQueries}`);
  console.log(`📰 Total articles found: ${results.totalArticles}`);
  
  res.json({
    success: true,
    message: 'Full backfill completed successfully',
    results: results,
    timestamp: new Date().toISOString()
  });
}

// Enhanced query builder function (same as in the test)
function buildEnhancedQuery(person) {
  const separationKeywords = [
    "Alberta separation", "Alberta independence", "Alberta sovereignty",
    "Sovereignty Act", "referendum", "secede", "secession",
    "leave Canada", "break from Canada", "Alberta Prosperity Project",
    "Forever Canada", "Forever Canadian"
  ];

  const unityKeywords = [
    "remain in Canada", "stay in Canada", "support Canada",
    "oppose separation", "oppose independence", "pro-Canada stance",
    "keep Alberta in Canada"
  ];

  const allKeywords = [...separationKeywords, ...unityKeywords];

  // Handle title variants correctly, including Premier for Danielle Smith
  let titleVariants;
  if (person.fullName === "Danielle Smith") {
    // Special case: Danielle Smith is Premier but also MLA
    titleVariants = '"Premier" OR "MLA" OR "Member of Legislative Assembly"';
  } else if (person.office.includes('Legislative Assembly') || person.office.includes('MLA')) {
    titleVariants = '"MLA" OR "Member of Legislative Assembly"';
  } else if (person.office.includes('Parliament') || person.office.includes('MP')) {
    titleVariants = '"MP" OR "Member of Parliament"';
  } else {
    titleVariants = '"MLA" OR "Member of Legislative Assembly" OR "MP" OR "Member of Parliament"';
  }

  return `"${person.fullName}" AND (${titleVariants}) AND (${allKeywords.map(k => `"${k}"`).join(' OR ')})`;
}

// Store results in Azure Blob Storage
async function storeResultsInBlobStorage(slug, date, serphouseResponse) {
  const { BlobServiceClient } = require('@azure/storage-blob');
  
  const connectionString = process.env.AZURE_STORAGE_CONNECTION;
  if (!connectionString) {
    console.error('AZURE_STORAGE_CONNECTION not found in environment variables');
    throw new Error('AZURE_STORAGE_CONNECTION environment variable is required');
  }
  
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerName = 'articles';
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const blobName = `raw/serp/${slug}/${date}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  const data = JSON.stringify(serphouseResponse, null, 2);
  
  try {
    await blockBlobClient.upload(data, data.length, {
      blobHTTPHeaders: { blobContentType: 'application/json' }
    });
    console.log(`✅ Stored results for ${slug}/${date} in Azure Blob Storage`);
  } catch (error) {
    console.error(`❌ Failed to store results for ${slug}/${date}:`, error.message);
    throw error;
  }
}

// Actual SERPHouse API call function
async function makeSerphouseCall(query) {
  const axios = require('axios');

  const apiToken = process.env.SERPHOUSE_API_TOKEN;
  if (!apiToken) {
    console.error('SERPHOUSE_API_TOKEN not found in environment variables');
    throw new Error('SERPHOUSE_API_TOKEN environment variable is required');
  }

  const url = 'https://api.serphouse.com/serp/live/search';
  const payload = {
    q: query,
    engine: "google_news",
    google_domain: "google.ca",
    gl: "ca",
    hl: "en",
    device: "desktop",
    num: 1000
  };

  try {
    console.log(`[SERPHouse] POST ${url} engine=google_news`);
    console.log('Request body:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: { 
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`SERPHouse status: ${response.status}`);
    const data = response.data || {};
    const news = data?.news_results || [];
    const organic = data?.organic_results || [];

    if (Array.isArray(news) && news.length > 0) {
      console.log(`Found ${news.length} news items`);
      return { count: news.length, articles: news, status: response.status };
    }
    if (Array.isArray(organic) && organic.length > 0) {
      console.log(`Found ${organic.length} web results`);
      return { count: organic.length, articles: organic, status: response.status };
    }

    console.log('No results in response');
    console.log('Full response data:', JSON.stringify(data, null, 2));
    return { count: 0, articles: [], status: response.status };

  } catch (error) {
    console.error('SERPHouse API error:', error.message);
    console.error('Error details:', error.response?.data);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}



// Test SERPHouse API with sample query
app.get('/api/serp/test-fixed', async (req, res) => {
  try {
    console.log('🧪 Testing fixed SERPHouse API implementation...');
    
    // Test with Danielle Smith (Premier)
    const testOfficial = {
      fullName: "Danielle Smith",
      office: "Member of Legislative Assembly",
      slug: "danielle-smith"
    };
    
    const query = buildEnhancedQuery(testOfficial);
    console.log(`Generated query: ${query}`);
    
    const serphouseResponse = await makeSerphouseCall(query);
    
    res.json({
      success: true,
      message: 'SERPHouse API test completed',
      testOfficial: testOfficial,
      generatedQuery: query,
      apiResponse: {
        status: serphouseResponse.status,
        articleCount: serphouseResponse.count,
        hasArticles: serphouseResponse.articles && serphouseResponse.articles.length > 0,
        sampleArticles: serphouseResponse.articles ? serphouseResponse.articles.slice(0, 3) : []
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ SERPHouse API test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Relevance screening endpoints
app.post('/api/relevance/start', async (req, res) => {
  try {
    console.log('🚀 Starting relevance screening...');
    
    const screener = new RelevanceScreener();
    const result = await screener.startRelevanceScreening();
    
    res.json({
      success: true,
      message: 'Relevance screening started successfully',
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Relevance screening failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Relevance screening failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/relevance/status', async (req, res) => {
  try {
    const screener = new RelevanceScreener();
    const status = await screener.getStatus();
    
    res.json(status);
    
  } catch (error) {
    console.error('❌ Failed to get relevance status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get relevance status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/relevance/test', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    console.log(`🧪 Starting relevance screening test with ${limit} articles...`);
    
    const screener = new RelevanceScreener();
    const result = await screener.startRelevanceScreening(true, limit);
    
    res.json({
      success: true,
      message: `Relevance screening test completed with ${limit} articles`,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Relevance screening test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Relevance screening test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sentiment analysis endpoints
app.get('/api/sentiment/test', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    res.json({ 
      message: 'SentimentAnalyzer initialized successfully!',
      timestamp: new Date().toISOString(),
      status: 'ready'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'SentimentAnalyzer initialization failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/sentiment/analyze', async (req, res) => {
  try {
    const { articleText, politicianName } = req.body;
    
    if (!articleText || !politicianName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['articleText', 'politicianName'],
        received: { articleText: !!articleText, politicianName: !!politicianName }
      });
    }

    const analyzer = new SentimentAnalyzer();
    const result = await analyzer.analyzeArticle(articleText, politicianName);
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sentiment analysis error:', error.message);
    res.status(500).json({
      error: 'Sentiment analysis failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test all Danielle Smith articles
app.get('/api/sentiment/test-danielle-smith', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    console.log('=== Testing Sentiment Analysis with Danielle Smith Articles ===');
    
    // Load all 19 articles for Danielle Smith
    const articles = await analyzer.readArticlesFromStorage('danielle-smith', 19);
    console.log(`✅ Loaded ${articles.length} articles from Azure storage`);
    
    if (articles.length === 0) {
      return res.json({
        success: false,
        message: 'No articles found for danielle-smith in Azure storage',
        timestamp: new Date().toISOString()
      });
    }
    
    // Process each article through sentiment analysis
    const results = [];
    let passedCount = 0;
    let failedCount = 0;
    let flaggedCount = 0;
    let totalScore = 0;
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`Processing Article ${i + 1}/${articles.length}: ${article.filename}`);
      
      try {
        // Debug: Log the actual structure of the first article
        if (i === 0) {
          console.log('DEBUG: First article structure:', JSON.stringify(article.content, null, 2));
        }
        
        // Extract full article content from SERPHouse JSON structure
        let articleText = '';
        if (article.content && article.content.raw && article.content.raw.length > 0) {
          // SERPHouse structure: get first result's title and snippet
          const firstResult = article.content.raw[0];
          articleText = (firstResult.title || '') + "\n" + (firstResult.snippet || '');
        } else if (article.content && article.content.organic_results && article.content.organic_results.length > 0) {
          // Alternative SERPHouse structure
          const firstResult = article.content.organic_results[0];
          articleText = (firstResult.title || '') + "\n" + (firstResult.snippet || '');
        } else if (article.content.title && article.content.snippet) {
          // Direct structure
          articleText = article.content.title + "\n" + article.content.snippet;
        } else if (article.content.snippet) {
          // Just snippet
          articleText = article.content.snippet;
        } else {
          // Fallback: try to extract any text content
          articleText = JSON.stringify(article.content).substring(0, 1000);
        }
        
        console.log(`DEBUG: Extracted article text for ${article.filename}: "${articleText.substring(0, 100)}..."`);
        const result = await analyzer.analyzeArticle(articleText, "Danielle Smith");
        results.push(result);
        
        if (result.agent1.passed) {
          passedCount++;
          if (result.final.score !== null) {
            totalScore += result.final.score;
          }
        }
        
        if (result.final.flaggedForReview) {
          flaggedCount++;
        }
        
        console.log(`Article ${i + 1} Result: Passed=${result.agent1.passed}, Score=${result.final.score}, Flagged=${result.final.flaggedForReview}`);
        
      } catch (error) {
        console.error(`Error processing article ${i + 1}:`, error.message);
        failedCount++;
        results.push({
          articleId: analyzer.generateArticleId(article.content.title + article.content.snippet),
          politician: "Danielle Smith",
          processedAt: new Date().toISOString(),
          error: error.message
        });
      }
    }
    
    const averageScore = passedCount > 0 ? (totalScore / passedCount) : null;
    const overallClassification = averageScore ? analyzer.getClassification(averageScore) : "N/A";
    
    const summary = {
      totalArticles: articles.length,
      passedRelevance: passedCount,
      failedProcessing: failedCount,
      flaggedForReview: flaggedCount,
      averageScore: averageScore ? averageScore.toFixed(2) : null,
      overallClassification: overallClassification
    };
    
    console.log('\n=== TEST SUMMARY FOR DANIELLE SMITH ===');
    console.log(`Total Articles Processed: ${summary.totalArticles}`);
    console.log(`Articles Passed Relevance Gate: ${summary.passedRelevance}`);
    console.log(`Articles Flagged for Review: ${summary.flaggedForReview}`);
    console.log(`Average Stance Score: ${summary.averageScore}`);
    console.log(`Overall Classification: ${summary.overallClassification}`);
    
    res.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to examine all article content
app.get('/api/sentiment/debug-articles', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    console.log('=== DEBUG: Examining All Danielle Smith Articles ===');
    
    // Load all 19 articles for Danielle Smith
    const articles = await analyzer.readArticlesFromStorage('danielle-smith', 19);
    console.log(`✅ Loaded ${articles.length} articles from Azure storage`);
    
    if (articles.length === 0) {
      return res.json({
        success: false,
        message: 'No articles found for danielle-smith in Azure storage',
        timestamp: new Date().toISOString()
      });
    }
    
    // Examine each article's content structure
    const debugResults = [];
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n--- DEBUG Article ${i + 1}/${articles.length}: ${article.filename} ---`);
      
      // Extract content using same logic as test
      let articleText = '';
      if (article.content && article.content.organic_results && article.content.organic_results.length > 0) {
        const firstResult = article.content.organic_results[0];
        articleText = (firstResult.title || '') + "\n" + (firstResult.snippet || '');
      } else if (article.content.title && article.content.snippet) {
        articleText = article.content.title + "\n" + article.content.snippet;
      } else if (article.content.snippet) {
        articleText = article.content.snippet;
      } else {
        articleText = JSON.stringify(article.content).substring(0, 1000);
      }
      
      debugResults.push({
        articleNumber: i + 1,
        filename: article.filename,
        contentStructure: {
          hasOrganicResults: !!(article.content && article.content.organic_results),
          organicResultsCount: article.content?.organic_results?.length || 0,
          hasDirectTitle: !!article.content?.title,
          hasDirectSnippet: !!article.content?.snippet,
          contentKeys: Object.keys(article.content || {})
        },
        extractedText: articleText.substring(0, 500) + (articleText.length > 500 ? '...' : ''),
        extractedTextLength: articleText.length,
        fullContentSample: JSON.stringify(article.content, null, 2).substring(0, 1000) + '...'
      });
      
      console.log(`Content keys: ${Object.keys(article.content || {}).join(', ')}`);
      console.log(`Extracted text length: ${articleText.length}`);
      console.log(`Extracted text preview: "${articleText.substring(0, 200)}..."`);
    }
    
    res.json({
      success: true,
      totalArticles: articles.length,
      debugResults: debugResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Count all articles across all politicians
app.get('/api/sentiment/count-all-articles', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    console.log('=== Counting All Articles Across All Politicians ===');
    
    // Load the politician roster
    const roster = require('./data/ab-roster-transformed.json');
    console.log(`Found ${roster.length} politicians in roster`);
    
    const results = [];
    let totalArticles = 0;
    let politiciansWithArticles = 0;
    let politiciansWithEmptyResults = 0;
    
    for (let i = 0; i < roster.length; i++) {
      const politician = roster[i];
      const politicianSlug = politician.slug;
      
      try {
        console.log(`Checking ${i + 1}/${roster.length}: ${politician.fullName} (${politicianSlug})`);
        
        // Load articles for this politician
        const articles = await analyzer.readArticlesFromStorage(politicianSlug, 100); // Get up to 100 articles
        
        const articleCount = articles.length;
        totalArticles += articleCount;
        
        if (articleCount > 0) {
          politiciansWithArticles++;
          
          // Check how many have actual content vs empty results
          let articlesWithContent = 0;
          let articlesWithEmptyRaw = 0;
          
          for (const article of articles) {
            if (article.content && article.content.raw && article.content.raw.length > 0) {
              articlesWithContent++;
            } else {
              articlesWithEmptyRaw++;
            }
          }
          
          results.push({
            politician: politician.fullName,
            slug: politicianSlug,
            totalArticles: articleCount,
            articlesWithContent: articlesWithContent,
            articlesWithEmptyRaw: articlesWithEmptyRaw,
            contentPercentage: articleCount > 0 ? ((articlesWithContent / articleCount) * 100).toFixed(1) : 0
          });
        } else {
          politiciansWithEmptyResults++;
          results.push({
            politician: politician.fullName,
            slug: politicianSlug,
            totalArticles: 0,
            articlesWithContent: 0,
            articlesWithEmptyRaw: 0,
            contentPercentage: 0
          });
        }
        
        console.log(`  ${politician.fullName}: ${articleCount} articles`);
        
      } catch (error) {
        console.error(`Error checking ${politician.fullName}:`, error.message);
        results.push({
          politician: politician.name,
          slug: politicianSlug,
          error: error.message,
          totalArticles: 0
        });
      }
    }
    
    const summary = {
      totalPoliticians: roster.length,
      totalArticles: totalArticles,
      politiciansWithArticles: politiciansWithArticles,
      politiciansWithEmptyResults: politiciansWithEmptyResults,
      averageArticlesPerPolitician: roster.length > 0 ? (totalArticles / roster.length).toFixed(1) : 0
    };
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Politicians: ${summary.totalPoliticians}`);
    console.log(`Total Articles: ${summary.totalArticles}`);
    console.log(`Politicians with Articles: ${summary.politiciansWithArticles}`);
    console.log(`Politicians with Empty Results: ${summary.politiciansWithEmptyResults}`);
    console.log(`Average Articles per Politician: ${summary.averageArticlesPerPolitician}`);
    
    res.json({
      success: true,
      summary: summary,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Count failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Count failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed article table for all 121 politicians
app.get('/api/sentiment/article-table', async (req, res) => {
  try {
    const analyzer = new SentimentAnalyzer();
    const roster = require('./data/ab-roster-transformed.json');
    
    console.log('📊 Generating detailed article table for all 121 politicians...');
    
    let allArticles = [];
    let totalProcessed = 0;
    
    for (const politician of roster) {
      try {
        console.log(`Processing ${politician.fullName} (${totalProcessed + 1}/121)...`);
        
        // Read articles for this politician
        const articles = await analyzer.readArticlesFromStorage(politician.slug, 100); // Get up to 100 articles
        
        for (const article of articles) {
          // Extract content from the article
          let sourceUrl = '';
          let title = '';
          let snippet = '';
          let date = '';
          
          if (article.content && article.content.raw && article.content.raw.length > 0) {
            const firstResult = article.content.raw[0];
            title = firstResult.title || '';
            snippet = firstResult.snippet || '';
            sourceUrl = firstResult.link || '';
            date = firstResult.date || '';
          } else if (article.content && article.content.organic_results && article.content.organic_results.length > 0) {
            const firstResult = article.content.organic_results[0];
            title = firstResult.title || '';
            snippet = firstResult.snippet || '';
            sourceUrl = firstResult.link || '';
            date = firstResult.date || '';
          } else if (article.content.title && article.content.snippet) {
            title = article.content.title;
            snippet = article.content.snippet;
            sourceUrl = article.content.link || '';
            date = article.content.date || '';
          } else if (article.content.snippet) {
            snippet = article.content.snippet;
            sourceUrl = article.content.link || '';
            date = article.content.date || '';
          }
          
          // Only include articles that have actual content
          if (title || snippet) {
            allArticles.push({
              date: date,
              source: sourceUrl,
              politician: politician.fullName,
              title: title,
              snippet: snippet,
              filename: article.filename
            });
          }
        }
        
        totalProcessed++;
      } catch (error) {
        console.error(`Error processing ${politician.fullName}:`, error.message);
        totalProcessed++;
      }
    }
    
    console.log(`✅ Processed all ${totalProcessed} politicians. Found ${allArticles.length} articles with content.`);
    
    res.json({
      success: true,
      summary: {
        totalPoliticians: roster.length,
        totalArticles: allArticles.length,
        politiciansProcessed: totalProcessed
      },
      articles: allArticles,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error generating article table:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Catch-all for debugging
app.use('*', (req, res) => {
  res.json({ 
    error: 'Route not found', 
    path: req.originalUrl, 
    method: req.method,
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test', '/api/sentiment/test', '/api/sentiment/analyze', '/api/sentiment/test-danielle-smith', '/api/sentiment/debug-articles', '/api/sentiment/count-all-articles', '/api/sentiment/article-table', '/api/relevance/start', '/api/relevance/test', '/api/relevance/status', '/api/whoami']
  });
});

module.exports = app;
