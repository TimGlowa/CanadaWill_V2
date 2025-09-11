const axios = require('axios');

// Sample a few officials to get an estimate of publication distribution
const sampleOfficials = [
    'danielle-smith',
    'pierre-poilievre', 
    'rachel-notley',
    'jason-kenney',
    'jagmeet-singh'
];

async function samplePublications() {
    console.log('Sampling publications from a few officials to estimate distribution...\n');
    
    const publicationCounts = new Map();
    let totalArticles = 0;
    
    for (const official of sampleOfficials) {
        try {
            console.log(`Sampling ${official}...`);
            
            // Get a small sample (30 days) to avoid timeouts
            const response = await axios.get(
                `https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net/api/news/serp/backfill?who=${official}&days=30&store=0`,
                { timeout: 30000 }
            );
            
            if (response.data && response.data.count > 0) {
                console.log(`  Found ${response.data.count} articles`);
                
                // Note: The API response doesn't include the actual articles in the response
                // This is just a demonstration of the approach
                // In practice, we'd need to modify the API to return article details
                // or download the actual JSON files from storage
            }
            
        } catch (error) {
            console.error(`Error sampling ${official}:`, error.message);
        }
    }
    
    console.log('\nNote: This is a sample approach. For complete analysis, you need to:');
    console.log('1. Download all JSON files from Azure Storage');
    console.log('2. Run the local analysis script');
    console.log('\nTo download the data, run: ./download-articles.sh');
    console.log('Then run: node analyze-publications-local.js');
}

samplePublications().catch(console.error);


