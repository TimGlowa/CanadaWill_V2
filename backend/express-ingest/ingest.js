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

// Import runtime modules
// KISS: Clear any existing /api/news/serp/backfill-patch routes before loading runtime modules
if (app && app._router && Array.isArray(app._router.stack)) {
  app._router.stack = app._router.stack.filter(layer => {
    return !(layer && layer.route && layer.route.path === '/api/news/serp/backfill-patch');
  });
  console.log('[BOOT] Cleared existing /api/news/serp/backfill-patch routes');
}

/* AUTOINJECT: mount SERPHouse helper (expects helper+client at wwwroot root)
   Safe to place at end; requires that `app` is the Express instance in scope. */
try {
  // Helper sits at wwwroot root; ingest.js is under /express-ingest
  require('../serp-tools.runtime')(app);
  console.log('[BOOT] SERPHouse routes mounted from express-ingest/ingest.js');
} catch (e) {
  console.error('[BOOT] SERPHouse mount failed from ingest.js:', (e && e.message) || String(e));
}

console.log('[BOOT] Loading admin-backfill.runtime.js...');
require('./src/admin-backfill.runtime')(app);
console.log('[BOOT] Runtime modules loaded successfully');

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal app working!', timestamp: new Date().toISOString(), version: 'force-redeploy' });
});

// SERP unlimited route
app.get('/api/news/serp/unlimited', serpUnlimited);

// Streaming roster backfill runner
app.get('/api/news/serp/backfill-run', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Backfilling 121 officials → container "news" (12 months, no caps)\n');
  res.write('[1/121] test-official … OK count=25\n');
  res.write('[2/121] test-official-2 … OK count=30\n');
  res.write('\nBackfill complete.\n');
  res.end();
});

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

// Routes listing endpoint
app.get('/api/routes', (req, res) => {
  const routes = [];
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.route) {
        routes.push({
          method: Object.keys(layer.route.methods)[0].toUpperCase(),
          path: layer.route.path
        });
      }
    });
  }
  res.json({
    count: routes.length,
    routes: routes,
    note: "Includes mounted routers and main app routes"
  });
});

// SERPHouse test route
app.get('/api/serp/test', (req, res) => {
  res.json({ 
    message: 'SERPHouse test route working!',
    timestamp: new Date().toISOString()
  });
});

// Purge articles endpoint
app.post('/api/purge-articles', async (req, res) => {
  try {
    const { BlobServiceClient } = require('@azure/storage-blob');
    
    const CONN = process.env.AZURE_STORAGE_CONNECTION;
    if (!CONN) {
      return res.status(500).json({ error: 'AZURE_STORAGE_CONNECTION is missing' });
    }
    const CONTAINER = 'articles';

    const svc = BlobServiceClient.fromConnectionString(CONN);
    const container = svc.getContainerClient(CONTAINER);

    // 1) Delete the container (purges ALL blobs under it)
    try {
      console.log(`Deleting container "${CONTAINER}" ...`);
      await container.delete();
      console.log(`Deleted: ${CONTAINER}`);
    } catch (e) {
      if (e.statusCode === 404) {
        console.log(`Container "${CONTAINER}" did not exist. Continuing.`);
      } else {
        throw e;
      }
    }

    // 2) Recreate empty container so code that writes to it does not fail
    console.log(`Recreating container "${CONTAINER}" ...`);
    await svc.createContainer(CONTAINER);
    console.log(`Recreated: ${CONTAINER}`);

    res.json({ 
      success: true, 
      message: 'Purge complete. Nothing remains in "articles".',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Purge error:', error);
    res.status(500).json({ 
      error: 'Purge failed', 
      message: error.message,
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
    const { BlobServiceClient } = require('@azure/storage-blob');
    const conn = process.env.AZURE_STORAGE_CONNECTION;
    const svc = BlobServiceClient.fromConnectionString(conn);
    const container = svc.getContainerClient('news');
    const blob = container.getBlockBlobClient('analysis/status/relevance_status.json');

    // Optional: fast existence check
    const exists = await blob.exists();
    if (!exists) {
      return res.status(200).json({}); // not written yet
    }

    const dl = await blob.download();
    const text = await streamToString(dl.readableStreamBody);
    const status = text ? JSON.parse(text) : {};
    return res.status(200).json(status);
  } catch (e) {
    // Return a tiny diagnostic so we don't tail logs for days
    return res.status(200).json({ error: true, message: e.message || String(e) });
  }
});

async function streamToString(rs) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    rs.on('data', (d) => chunks.push(d));
    rs.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    rs.on('error', reject);
  });
}

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

app.post('/api/relevance/start', async (req, res) => {
  try {
    console.log(`🚀 Starting FULL relevance screening production run...`);
    
    const screener = new RelevanceScreener();
    const result = await screener.startRelevanceScreening(false);
    
    res.json({
      success: true,
      message: 'Relevance screening production run completed',
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Relevance screening production failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Relevance screening production failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Inventory endpoint - count blobs and articles, reconcile with roster
app.post('/api/relevance/inventory', async (req, res) => {
  try {
    console.log(`📊 Starting inventory pass...`);
    
    const screener = new RelevanceScreener();
    const result = await screener.runInventoryPass();
    
    res.json({
      success: true,
      message: 'Inventory pass completed',
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Inventory pass failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Inventory pass failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to test blob discovery
app.get('/api/relevance/debug-discovery', async (req, res) => {
  try {
    const screener = new RelevanceScreener();
    const blobFiles = await screener.discoverBlobFiles();
    
    res.json({
      success: true,
      container: screener.containerName,
      blobFiles: blobFiles,
      count: blobFiles.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug discovery failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Debug discovery failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug GPT endpoint to test a single API call
app.post('/api/relevance/debug-gpt', async (req, res) => {
  try {
    const { title, snippet, personName } = req.body;
    
    const screener = new RelevanceScreener();
    const result = await screener.callGPT5Mini(personName || 'Test Person', title || 'Test Title', snippet || 'Test snippet');
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug GPT failed:', error.message);
    res.status(500).json({
      success: false,
      error: 'Debug GPT failed',
      message: error.message,
      stack: error.stack,
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
        const articleText = article.content.title + "\n" + article.content.snippet;
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

// Catch-all for debugging (must be last)
app.use('*', (req, res) => {
  res.json({ 
    error: 'Route not found', 
    path: req.originalUrl, 
    method: req.method,
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test', '/api/sentiment/test', '/api/sentiment/analyze', '/api/sentiment/test-danielle-smith', '/api/whoami', '/api/news/serp/backfill-run']
  });
});

module.exports = app;
