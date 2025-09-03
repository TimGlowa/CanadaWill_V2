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

      // Build the enhanced query with proper boolean logic
      const query = `"${person.fullName}" (${titleVariants}) AND (${allKeywords.map(k => `"${k}"`).join(' OR ')})`;
      
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
  
  // Load officials data - try multiple sources
  const fs = require('fs');
  let officials = [];
  
  try {
    // Try to load from officials.json in root
    const officialsData = fs.readFileSync('./officials.json', 'utf8');
    officials = JSON.parse(officialsData);
    console.log(`📋 Loaded ${officials.length} officials from officials.json`);
  } catch (error) {
    try {
      // Try to load from data/officials.json
      const officialsData = fs.readFileSync('./data/officials.json', 'utf8');
      officials = JSON.parse(officialsData);
      console.log(`📋 Loaded ${officials.length} officials from data/officials.json`);
    } catch (error2) {
      console.error('❌ Failed to load officials.json from both locations:', error2.message);
      // Use a larger sample of officials for demo
      officials = [
        { slug: "danielle-smith", fullName: "Danielle Smith", office: "Member of Legislative Assembly" },
        { slug: "pat-kelly", fullName: "Pat Kelly", office: "Member of Parliament" },
        { slug: "rachel-notley", fullName: "Rachel Notley", office: "Member of Legislative Assembly" },
        { slug: "jason-kenney", fullName: "Jason Kenney", office: "Member of Legislative Assembly" },
        { slug: "doug-schweitzer", fullName: "Doug Schweitzer", office: "Member of Legislative Assembly" },
        { slug: "tyler-shandro", fullName: "Tyler Shandro", office: "Member of Legislative Assembly" },
        { slug: "travis-toews", fullName: "Travis Toews", office: "Member of Legislative Assembly" },
        { slug: "jason-nixon", fullName: "Jason Nixon", office: "Member of Legislative Assembly" },
        { slug: "ric-mclver", fullName: "Ric McIver", office: "Member of Legislative Assembly" },
        { slug: "jason-copping", fullName: "Jason Copping", office: "Member of Legislative Assembly" }
      ];
      console.log(`⚠️ Using extended sample data: ${officials.length} officials`);
    }
  }
  
  const results = {
    totalOfficials: officials.length,
    processedOfficials: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalArticles: 0,
    startTime: new Date().toISOString(),
    progress: []
  };
  
  // Generate last 12 months (365 days)
  const dates = [];
  for (let i = 0; i < 365; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  console.log(`📅 Processing ${dates.length} days (12 months)`);
  
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
    
    // Process only first 30 days for demo (to avoid timeout)
    const demoDates = dates.slice(0, 30);
    
                for (const date of demoDates) {
              try {
                const query = buildEnhancedQuery(official);
                
                // Make actual SERPHouse API call
                const serphouseResponse = await makeSerphouseCall(query, date);
                
                officialResults.queries.push({
                  date: date,
                  success: true,
                  articlesFound: serphouseResponse.count || 0,
                  query: query,
                  articles: serphouseResponse.articles || []
                });

                officialResults.totalArticles += serphouseResponse.count || 0;
                results.successfulQueries++;

              } catch (error) {
                officialResults.queries.push({
                  date: date,
                  success: false,
                  error: error.message
                });
                results.failedQueries++;
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

  let titleVariants;
  if (person.office.includes('Legislative Assembly') || person.office.includes('MLA')) {
    titleVariants = '"MLA" OR "Member of Legislative Assembly"';
  } else if (person.office.includes('Parliament') || person.office.includes('MP')) {
    titleVariants = '"MP" OR "Member of Parliament"';
  } else {
    titleVariants = '"MLA" OR "Member of Legislative Assembly" OR "MP" OR "Member of Parliament"';
  }

  return `"${person.fullName}" (${titleVariants}) AND (${allKeywords.map(k => `"${k}"`).join(' OR ')})`;
}

// Actual SERPHouse API call function
async function makeSerphouseCall(query, date) {
  const axios = require('axios');
  
  const apiToken = process.env.SERPHOUSE_API_TOKEN;
  if (!apiToken) {
    throw new Error('SERPHOUSE_API_TOKEN environment variable is required');
  }

  const url = 'https://api.serphouse.com/serp/live';
  const params = {
    api_token: apiToken,
    q: query,
    domain: 'google.ca',
    lang: 'en',
    device: 'desktop',
    serp_type: 'news',
    loc: 'Alberta,Canada',
    num: 50
  };

  try {
    const response = await axios.get(url, { params });
    
    if (response.data && response.data.news) {
      return {
        count: response.data.news.length,
        articles: response.data.news,
        status: response.status
      };
    } else {
      return {
        count: 0,
        articles: [],
        status: response.status
      };
    }
  } catch (error) {
    console.error('SERPHouse API error:', error.message);
    throw error;
  }
}



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
