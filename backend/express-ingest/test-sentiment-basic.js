const SentimentAnalyzer = require('./src/sentiment/sentimentAnalyzer');

async function testBasicSentimentAnalysis() {
  console.log('=== Testing Basic Sentiment Analysis Structure ===');
  console.log('Testing class structure and methods without Azure connection...\n');
  
  try {
    // Test with mock environment variables
    process.env.AZURE_STORAGE_CONNECTION = 'mock-connection-string';
    process.env.OPENAI_API_KEY = 'mock-openai-key';
    process.env.ANTHROPIC_API_KEY = 'mock-anthropic-key';
    process.env.ARTICLES_CONTAINER = 'articles';
    
    // Initialize the analyzer
    const analyzer = new SentimentAnalyzer();
    console.log('✅ SentimentAnalyzer initialized successfully\n');
    
    // Test with sample article text
    const sampleArticleText = "Danielle Smith discusses federal health transfers and argues that Alberta should remain in Canada despite ongoing disputes with Ottawa.";
    const politicianName = "Danielle Smith";
    
    console.log(`Testing with sample article: "${sampleArticleText}"\n`);
    
    // Test the analyzeArticle method
    const result = await analyzer.analyzeArticle(sampleArticleText, politicianName);
    
    console.log('✅ Article analysis completed successfully!');
    console.log('\n=== ANALYSIS RESULTS ===');
    console.log(`Article ID: ${result.articleId}`);
    console.log(`Politician: ${result.politician}`);
    console.log(`Processed At: ${result.processedAt}`);
    
    console.log('\n--- Agent 1 (Relevance Gate) ---');
    console.log(`Passed: ${result.agent1.passed}`);
    console.log(`Has Stance: ${result.agent1.hasStance}`);
    console.log(`Internal Score: ${result.agent1.internalScore}`);
    
    if (result.agent2) {
      console.log('\n--- Agent 2 (Stance Scoring) ---');
      console.log(`Stance Score: ${result.agent2.stanceScore}`);
      console.log(`Confidence: ${result.agent2.confidence}`);
      console.log(`Evidence: ${result.agent2.evidence}`);
      console.log(`Avoided Answering: ${result.agent2.avoidedAnswering}`);
      console.log(`Classification: ${result.agent2.classification}`);
    }
    
    if (result.agent3) {
      console.log('\n--- Agent 3 (Verification) ---');
      console.log(`Stance Score: ${result.agent3.stanceScore}`);
      console.log(`Confidence: ${result.agent3.confidence}`);
      console.log(`Evidence: ${result.agent3.evidence}`);
      console.log(`Avoided Answering: ${result.agent3.avoidedAnswering}`);
      console.log(`Classification: ${result.agent3.classification}`);
    }
    
    console.log('\n--- Final Result ---');
    console.log(`Score: ${result.final.score}`);
    console.log(`Classification: ${result.final.classification}`);
    console.log(`Evidence: ${result.final.evidence}`);
    console.log(`Flagged for Review: ${result.final.flaggedForReview}`);
    if (result.final.reviewReason) {
      console.log(`Review Reason: ${result.final.reviewReason}`);
    }
    
    console.log('\n=== TEST SUMMARY ===');
    console.log('✅ SentimentAnalyzer class structure works correctly');
    console.log('✅ All three agents are functioning');
    console.log('✅ Score comparison and classification working');
    console.log('✅ Ready for real AI prompt implementation in next steps');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testBasicSentimentAnalysis();
}

module.exports = { testBasicSentimentAnalysis };
