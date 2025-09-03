const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Import sentiment analyzer
const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Minimal app working!', timestamp: new Date().toISOString() });
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

// SERPHouse test route
app.get('/api/serp/test', (req, res) => {
  res.json({ 
    message: 'SERPHouse test route working!',
    timestamp: new Date().toISOString()
  });
});

// Test directory listing endpoint
app.get('/api/backfill/list', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    const cwd = process.cwd();
    const files = fs.readdirSync(cwd);
    const scriptsDir = fs.existsSync('./scripts') ? fs.readdirSync('./scripts') : 'scripts directory not found';
    
    res.json({
      cwd: cwd,
      files: files,
      scriptsDir: scriptsDir,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backfill execution endpoint
app.post('/api/backfill/run', async (req, res) => {
  try {
    const { script } = req.body;
    const { spawn } = require('child_process');
    
    let scriptPath;
    if (script === 'test') {
      scriptPath = './scripts/test-backfill.js';
    } else if (script === 'full') {
      scriptPath = './scripts/12-month-backfill.js';
    } else if (script === 'query-test') {
      scriptPath = './test-enhanced-query-builder.js';
    } else {
      return res.status(400).json({ error: 'Invalid script. Use "test", "full", or "query-test"' });
    }
    
    console.log(`🚀 Starting ${script} backfill script...`);
    
    const child = spawn('node', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(text);
    });
    
    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      console.error(text);
    });
    
    child.on('close', (code) => {
      console.log(`Backfill script finished with code ${code}`);
      res.json({
        success: code === 0,
        exitCode: code,
        output: output,
        error: errorOutput,
        script: script,
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('Error running backfill:', error);
    res.status(500).json({ 
      error: 'Failed to run backfill script',
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
    const roster = require('./data/ab-roster.json');
    console.log(`Found ${roster.length} politicians in roster`);
    
    const results = [];
    let totalArticles = 0;
    let politiciansWithArticles = 0;
    let politiciansWithEmptyResults = 0;
    
    for (let i = 0; i < roster.length; i++) {
      const politician = roster[i];
      const politicianSlug = politician.slug;
      
      try {
        console.log(`Checking ${i + 1}/${roster.length}: ${politician.name} (${politicianSlug})`);
        
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
            politician: politician.name,
            slug: politicianSlug,
            totalArticles: articleCount,
            articlesWithContent: articlesWithContent,
            articlesWithEmptyRaw: articlesWithEmptyRaw,
            contentPercentage: articleCount > 0 ? ((articlesWithContent / articleCount) * 100).toFixed(1) : 0
          });
        } else {
          politiciansWithEmptyResults++;
          results.push({
            politician: politician.name,
            slug: politicianSlug,
            totalArticles: 0,
            articlesWithContent: 0,
            articlesWithEmptyRaw: 0,
            contentPercentage: 0
          });
        }
        
        console.log(`  ${politician.name}: ${articleCount} articles`);
        
      } catch (error) {
        console.error(`Error checking ${politician.name}:`, error.message);
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
    const roster = require('./data/ab-roster.json');
    
    console.log('📊 Generating detailed article table for all 121 politicians...');
    
    let allArticles = [];
    let totalProcessed = 0;
    
    for (const politician of roster) {
      try {
        console.log(`Processing ${politician.name} (${totalProcessed + 1}/121)...`);
        
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
              politician: politician.name,
              title: title,
              snippet: snippet,
              filename: article.filename
            });
          }
        }
        
        totalProcessed++;
      } catch (error) {
        console.error(`Error processing ${politician.name}:`, error.message);
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
    availableRoutes: ['/api/test', '/api/health', '/api/serp/test', '/api/sentiment/test', '/api/sentiment/analyze', '/api/sentiment/test-danielle-smith', '/api/sentiment/debug-articles', '/api/sentiment/count-all-articles', '/api/sentiment/article-table', '/api/whoami']
  });
});

module.exports = app;
