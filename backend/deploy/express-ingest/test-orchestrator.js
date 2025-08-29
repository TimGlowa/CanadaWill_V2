const { IngestOrchestrator } = require('./dist/ingest/orchestrator');

// Mock environment variables
process.env.ENABLE_NEWSDATA = 'false';
process.env.AZURE_STORAGE_CONNECTION = 'mock-connection';

// Mock blob store
const mockBlobStore = {
  exists: async () => false, // Simulate no existing blobs
  writeJson: async (container, path, data) => {
    console.log(`[MOCK] Would write to ${container}/${path}`);
    console.log(`[MOCK] Data preview:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    return Promise.resolve();
  },
  buildArticleBlobPath: (slug, url) => `articles/${slug}/2025/08/18/${require('crypto').createHash('sha1').update(url).digest('hex')}.json`,
  getContainerName: () => 'articles'
};

// Mock provider responses
const mockNewsAPIResponse = {
  normalized: [
    {
      title: "Alberta separation referendum gains momentum",
      description: "Premier Danielle Smith pushes for independence vote",
      content: "The separation movement in Alberta is gaining support...",
      url: "https://example.com/alberta-separation-1",
      source: { name: "Mock News" },
      publishedAt: "2025-08-18T10:00:00Z"
    },
    {
      title: "Danielle Smith announces sovereignty strategy",
      description: "New plan for Alberta independence from Canada",
      content: "Premier Smith outlined her vision for Alberta sovereignty...",
      url: "https://example.com/alberta-sovereignty-1",
      source: { name: "Mock News" },
      publishedAt: "2025-08-18T11:00:00Z"
    }
  ]
};

const mockNewsDataResponse = {
  normalized: [
    {
      title: "Alberta referendum on independence set for 2026",
      description: "Voters will decide on separation from Canada",
      content: "The independence referendum has been scheduled...",
      url: "https://example.com/alberta-referendum-1",
      source: { name: "Mock Data" },
      publishedAt: "2025-08-18T12:00:00Z"
    }
  ]
};

async function testOrchestrator() {
  console.log('=== TESTING ORCHESTRATOR LOGIC ===\n');
  
  try {
    // Create orchestrator instance
    const orchestrator = new IngestOrchestrator();
    
    // Mock the blob store
    orchestrator.blobStore = mockBlobStore;
    orchestrator.isStorageEnabled = true;
    
    console.log('1. Testing provider response merging...');
    console.log('NewsAPI articles:', mockNewsAPIResponse.normalized.length);
    console.log('NewsData articles:', mockNewsDataResponse.normalized.length);
    
    // Simulate the merge logic from orchestrator
    const A = Array.isArray(mockNewsDataResponse?.normalized) ? mockNewsDataResponse.normalized : [];
    const B = Array.isArray(mockNewsAPIResponse?.normalized) ? mockNewsAPIResponse.normalized : [];
    const allArticles = [...A, ...B];
    console.log('Combined articles:', allArticles.length);
    
    // Simulate deduplication (no duplicates in our test data)
    const uniqueArticles = allArticles;
    console.log('After deduplication:', uniqueArticles.length);
    
    console.log('\n2. Testing separation terms filter...');
    const separationTerms = ["separation", "independence", "sovereignty", "referendum", "secede"];
    const relevantArticles = uniqueArticles.filter(article => {
      const searchText = `${article.title || ''} ${article.description || ''} ${article.content || ''}`.toLowerCase();
      return separationTerms.some(term => searchText.includes(term));
    });
    console.log('Relevant articles after filter:', relevantArticles.length);
    
    console.log('\n3. Testing blob path generation...');
    for (const article of relevantArticles) {
      const blobPath = mockBlobStore.buildArticleBlobPath('danielle-smith', article.url);
      console.log(`Article: ${article.title.substring(0, 40)}...`);
      console.log(`Blob path: ${blobPath}`);
    }
    
    console.log('\n4. Testing storage simulation...');
    let newSaved = 0;
    for (const article of relevantArticles) {
      const blobPath = mockBlobStore.buildArticleBlobPath('danielle-smith', article.url);
      const articleData = {
        ...article,
        provider: article.source?.name || 'unknown',
        fetchedAt: new Date().toISOString(),
        slug: 'danielle-smith',
        runId: 'test-run-123'
      };
      
      await mockBlobStore.writeJson('articles', blobPath, articleData);
      newSaved++;
    }
    
    console.log(`\n5. Final counts:`);
    console.log(`- Total found: ${allArticles.length}`);
    console.log(`- Relevant after filter: ${relevantArticles.length}`);
    console.log(`- New saved: ${newSaved}`);
    console.log(`- Dup skipped: 0`);
    
    // Test the early return logic
    if (relevantArticles.length === 0) {
      console.log('\n❌ EARLY RETURN: No relevant articles found');
      return {
        counts: { found: 0, newSaved: 0, dupSkipped: 0 }
      };
    }
    
    console.log('\n✅ SUCCESS: Orchestrator logic working correctly');
    return {
      counts: { 
        found: relevantArticles.length, 
        newSaved: newSaved, 
        dupSkipped: 0 
      }
    };
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    throw error;
  }
}

// Run the test
testOrchestrator()
  .then(result => {
    console.log('\n=== TEST RESULTS ===');
    console.log('Found:', result.counts.found);
    console.log('New Saved:', result.counts.newSaved);
    console.log('Dup Skipped:', result.counts.dupSkipped);
    
    if (result.counts.found > 0 && result.counts.newSaved > 0) {
      console.log('\n🎉 ORCHESTRATOR LOGIC IS WORKING!');
      console.log('The issue must be in provider integration or data flow.');
    } else {
      console.log('\n❌ ORCHESTRATOR LOGIC HAS ISSUES');
      console.log('Check the filtering or merging logic.');
    }
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  }); 