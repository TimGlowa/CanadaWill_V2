const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Import sentiment analyzer
const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

// Import SERP unlimited route
const serpUnlimited = require('./routes/serp-unlimited');

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal app working!', timestamp: new Date().toISOString() });
});

// SERP unlimited route
app.get('/api/news/serp/unlimited', serpUnlimited);

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

// Catch-all for debugging
app.use('*', (req, res) => {
  res.json({ 
    error: 'Route not found', 
    path: req.originalUrl, 
    method: req.method,
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test', '/api/sentiment/test', '/api/sentiment/analyze', '/api/sentiment/test-danielle-smith', '/api/whoami']
  });
});

module.exports = app;
