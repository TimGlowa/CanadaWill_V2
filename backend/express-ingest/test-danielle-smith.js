const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

async function testDanielleSmithArticles() {
  console.log('=== Testing Sentiment Analysis with Danielle Smith Articles ===');
  console.log('Loading all 19 articles from Azure storage...\n');
  
  try {
    // Initialize the analyzer
    const analyzer = new SentimentAnalyzer();
    console.log('✅ SentimentAnalyzer initialized successfully\n');
    
    // Load all 19 articles for Danielle Smith
    const articles = await analyzer.readArticlesFromStorage('danielle-smith', 19);
    console.log(`✅ Loaded ${articles.length} articles from Azure storage\n`);
    
    if (articles.length === 0) {
      console.log('❌ No articles found for danielle-smith in Azure storage');
      return;
    }
    
    // Process each article through sentiment analysis
    const results = [];
    let passedCount = 0;
    let failedCount = 0;
    let flaggedCount = 0;
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n--- Processing Article ${i + 1}/${articles.length} ---`);
      console.log(`File: ${article.filename}`);
      console.log(`Size: ${article.size} bytes`);
      
      try {
        // Extract article text from SERPHouse JSON structure
        let articleText = '';
        if (article.content && article.content.organic_results) {
          // Combine title and snippet from first result
          const firstResult = article.content.organic_results[0];
          if (firstResult) {
            articleText = `${firstResult.title || ''} ${firstResult.snippet || ''}`.trim();
          }
        }
        
        if (!articleText) {
          console.log('⚠️  No article text found, skipping...');
          continue;
        }
        
        console.log(`Article text: "${articleText.substring(0, 100)}..."`);
        
        // Run sentiment analysis
        const result = await analyzer.analyzeArticle(articleText, 'Danielle Smith');
        results.push({
          filename: article.filename,
          result: result
        });
        
        // Track statistics
        if (result.agent1 && result.agent1.passed) {
          passedCount++;
          console.log(`✅ Agent 1: PASSED (score: ${result.agent1.internalScore})`);
          
          if (result.agent2 && result.agent3) {
            console.log(`📊 Agent 2 Score: ${result.agent2.stanceScore} (${result.agent2.classification})`);
            console.log(`📊 Agent 3 Score: ${result.agent3.stanceScore} (${result.agent3.classification})`);
            console.log(`🎯 Final Score: ${result.final.score} (${result.final.classification})`);
            
            if (result.final.flaggedForReview) {
              flaggedCount++;
              console.log(`🚩 FLAGGED FOR REVIEW: ${result.final.reviewReason}`);
            }
          }
        } else {
          failedCount++;
          console.log(`❌ Agent 1: FAILED - ${result.agent1 ? result.agent1.reason : 'No relevance gate result'}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing article ${i + 1}:`, error.message);
        failedCount++;
      }
    }
    
    // Summary statistics
    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.log(`Total Articles Processed: ${articles.length}`);
    console.log(`✅ Passed Relevance Gate: ${passedCount}`);
    console.log(`❌ Failed Relevance Gate: ${failedCount}`);
    console.log(`🚩 Flagged for Review: ${flaggedCount}`);
    console.log(`📈 Success Rate: ${((passedCount / articles.length) * 100).toFixed(1)}%`);
    
    if (passedCount > 0) {
      console.log('\n=== DETAILED RESULTS ===');
      results.forEach((item, index) => {
        if (item.result.agent1 && item.result.agent1.passed) {
          console.log(`\nArticle ${index + 1}: ${item.filename}`);
          console.log(`  Agent 1: PASSED (${item.result.agent1.internalScore})`);
          console.log(`  Agent 2: ${item.result.agent2.stanceScore} - ${item.result.agent2.classification}`);
          console.log(`  Agent 3: ${item.result.agent3.stanceScore} - ${item.result.agent3.classification}`);
          console.log(`  Final: ${item.result.final.score} - ${item.result.final.classification}`);
          if (item.result.final.flaggedForReview) {
            console.log(`  🚩 FLAGGED: ${item.result.final.reviewReason}`);
          }
        }
      });
    }
    
    console.log('\n=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDanielleSmithArticles();
}

module.exports = { testDanielleSmithArticles };
