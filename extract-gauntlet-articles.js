const fs = require('fs');
const path = require('path');

console.log('Extracting Gauntlet articles...\n');

const gauntletArticles = [];
const dataDir = 'downloaded-articles/raw/serp';

// Get all JSON files
const files = fs.readdirSync(dataDir, { recursive: true })
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dataDir, file));

let processedFiles = 0;

for (const filePath of files) {
    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const articles = data.raw || [];
        
        // Extract official name from file path
        const pathParts = filePath.split('/');
        const officialSlug = pathParts[pathParts.length - 2];
        const officialName = officialSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Find Gauntlet articles
        for (const article of articles) {
            if (article._raw && article._raw.channel && 
                (article._raw.channel === 'Gauntlet' || article._raw.channel === 'The Gauntlet')) {
                
                gauntletArticles.push({
                    date: article.date || 'N/A',
                    official: officialName,
                    headline: article.title || 'N/A',
                    snippet: article.snippet || 'N/A',
                    url: article.url || 'N/A',
                    channel: article._raw.channel
                });
            }
        }
        
        processedFiles++;
        if (processedFiles % 50 === 0) {
            console.log(`Processed ${processedFiles} files...`);
        }
        
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
    }
}

// Sort by date (newest first)
gauntletArticles.sort((a, b) => {
    if (a.date === 'N/A' && b.date === 'N/A') return 0;
    if (a.date === 'N/A') return 1;
    if (b.date === 'N/A') return -1;
    return new Date(b.date) - new Date(a.date);
});

console.log(`\nFound ${gauntletArticles.length} Gauntlet articles:\n`);

// Create table
console.log('| Date | Official | Headline | Snippet | URL |');
console.log('|------|----------|----------|---------|-----|');

for (const article of gauntletArticles) {
    const date = article.date === 'N/A' ? 'N/A' : new Date(article.date).toLocaleDateString();
    const headline = article.headline.length > 50 ? article.headline.substring(0, 47) + '...' : article.headline;
    const snippet = article.snippet.length > 100 ? article.snippet.substring(0, 97) + '...' : article.snippet;
    
    console.log(`| ${date} | ${article.official} | ${headline} | ${snippet} | ${article.url} |`);
}

// Also save to CSV
const csvContent = [
    'Date,Official,Headline,Snippet,URL,Channel',
    ...gauntletArticles.map(article => 
        `"${article.date}","${article.official}","${article.headline}","${article.snippet}","${article.url}","${article.channel}"`
    )
].join('\n');

fs.writeFileSync('gauntlet-articles.csv', csvContent);
console.log(`\nDetailed results saved to: gauntlet-articles.csv`);
