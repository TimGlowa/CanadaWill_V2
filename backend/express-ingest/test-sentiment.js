const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

async function testSentimentAnalysis() {
  console.log('=== Testing Sentiment Analysis with Real Data ===');
  console.log('Reading all 19 Danielle Smith articles from Azure Blob Storage...\n');
  
  try {
    // Initialize the analyzer
    const analyzer = new SentimentAnalyzer();
    console.log('✅ SentimentAnalyzer initialized successfully\n');
    
    // Read all articles for Danielle Smith
    const articles = await analyzer.readArticlesFromStorage('danielle-smith', 19);
    console.log(`✅ Loaded ${articles.length} articles from Azure Blob Storage\n`);
    
    // Process each article through the sentiment analyzer
    console.log('Processing articles through three-agent system...\n');
    
    const results = [];
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`Processing article ${i + 1}/${articles.length}: ${article.filename}`);
      
      try {
        // Extract article text from SERPHouse response
        // SERPHouse returns articles in results.news array
        const articleText = extractArticleText(article.content);
        
        if (articleText) {
          const result = await analyzer.analyzeArticle(articleText, 'Danielle Smith');
          results.push(result);
          
          console.log(`  ✅ Agent 1: ${result.agent1.passed ? 'PASSED' : 'FAILED'}`);
          if (result.agent2) {
            console.log(`  ✅ Agent 2: Score ${result.agent2.stanceScore}, Confidence ${result.agent2.confidence}`);
            console.log(`  ✅ Agent 3: Score ${result.agent3.stanceScore}, Confidence ${result.agent3.confidence}`);
            console.log(`  ✅ Final: ${result.final.classification} (${result.final.score})`);
            if (result.final.flaggedForReview) {
              console.log(`  ⚠️  Flagged for review: ${result.final.reviewReason}`);
            }
          }
        } else {
          console.log(`  ⚠️  No article text found in ${article.filename}`);
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing ${article.filename}:`, error.message);
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('=== TEST RESULTS SUMMARY ===');
    console.log(`Total articles processed: ${results.length}`);
    
    const passed = results.filter(r => r.agent1.passed).length;
    const failed = results.filter(r => !r.agent1.passed).length;
    const flagged = results.filter(r => r.final.flaggedForReview).length;
    
    console.log(`Articles passed Agent 1 (relevance gate): ${passed}`);
    console.log(`Articles failed Agent 1 (relevance gate): ${failed}`);
    console.log(`Articles flagged for review: ${flagged}`);
    
    if (results.length > 0) {
      const scores = results.filter(r => r.final.score !== null).map(r => r.final.score);
      if (scores.length > 0) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        console.log(`Average stance score: ${avgScore.toFixed(1)}`);
      }
    }
    
    console.log('\n✅ Sentiment analysis test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

function extractArticleText(serphouseResponse) {
  try {
    // SERPHouse returns articles in results.news array
    if (serphouseResponse.results && serphouseResponse.results.news) {
      const articles = serphouseResponse.results.news;
      if (articles.length > 0) {
        // Combine title and snippet for analysis
        const firstArticle = articles[0];
        return `${firstArticle.title || ''} ${firstArticle.snippet || ''}`.trim();
      }
    }
    
    // Fallback: try to find any text content
    if (serphouseResponse.raw && serphouseResponse.raw.length > 0) {
      const firstRaw = serphouseResponse.raw[0];
      if (firstRaw.title || firstRaw.snippet) {
        return `${firstRaw.title || ''} ${firstRaw.snippet || ''}`.trim();
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Warning: Could not extract article text:', error.message);
    return null;
  }
}

// Run the test
if (require.main === module) {
  testSentimentAnalysis();
}

module.exports = { testSentimentAnalysis, extractArticleText };
