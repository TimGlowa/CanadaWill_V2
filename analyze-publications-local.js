const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = './downloaded-articles';
const OUTPUT_FILE = 'publication-analysis.json';

function analyzePublications() {
    const publicationCounts = new Map();
    let totalArticles = 0;
    let processedFiles = 0;
    let errorCount = 0;

    console.log('Starting publication frequency analysis...');
    console.log('Reading articles from local directory...\n');

    if (!fs.existsSync(DATA_DIR)) {
        console.error(`Data directory ${DATA_DIR} not found.`);
        console.log('Please download the articles first using Azure CLI or Azure Storage Explorer.');
        console.log('Example Azure CLI command:');
        console.log('az storage blob download-batch --source news --destination ./downloaded-articles --account-name canadawillfuncstore2');
        process.exit(1);
    }

    try {
        // Recursively find all JSON files
        function findJsonFiles(dir) {
            const files = [];
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    files.push(...findJsonFiles(fullPath));
                } else if (item.endsWith('.json')) {
                    files.push(fullPath);
                }
            }
            
            return files;
        }

        const jsonFiles = findJsonFiles(DATA_DIR);
        console.log(`Found ${jsonFiles.length} JSON files to process...\n`);

        for (const filePath of jsonFiles) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);

                // Extract articles from the data structure
                let articles = [];
                if (Array.isArray(data.raw)) {
                    articles = data.raw;
                } else if (Array.isArray(data)) {
                    articles = data;
                }

                // Process each article
                for (const article of articles) {
                    if (article && article._raw && article._raw.channel) {
                        const publication = article._raw.channel;
                        publicationCounts.set(publication, (publicationCounts.get(publication) || 0) + 1);
                        totalArticles++;
                    }
                }

                processedFiles++;
                if (processedFiles % 50 === 0) {
                    console.log(`Processed ${processedFiles} files...`);
                }

            } catch (error) {
                console.error(`Error processing ${filePath}:`, error.message);
                errorCount++;
            }
        }

        // Sort publications by frequency (descending)
        const sortedPublications = Array.from(publicationCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        // Display results
        console.log('\n=== PUBLICATION FREQUENCY ANALYSIS ===');
        console.log(`Total articles analyzed: ${totalArticles}`);
        console.log(`Files processed: ${processedFiles}`);
        console.log(`Errors encountered: ${errorCount}`);
        console.log(`Unique publications: ${publicationCounts.size}\n`);

        console.log('All Publications by Article Count:');
        console.log('==================================');
        console.log('Publication'.padEnd(50) + 'Articles'.padStart(10));
        console.log('-'.repeat(60));

        sortedPublications.forEach(([publication, count]) => {
            const percentage = ((count / totalArticles) * 100).toFixed(1);
            console.log(
                publication.substring(0, 49).padEnd(50) + 
                `${count}`.padStart(8) + 
                ` (${percentage}%)`.padStart(8)
            );
        });

        // Save detailed results to file
        const results = {
            summary: {
                totalArticles,
                processedFiles,
                errorCount,
                uniquePublications: publicationCounts.size,
                analysisDate: new Date().toISOString()
            },
            publications: sortedPublications.map(([name, count]) => ({
                publication: name,
                articleCount: count,
                percentage: ((count / totalArticles) * 100).toFixed(2)
            }))
        };

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        console.log(`\nDetailed results saved to: ${OUTPUT_FILE}`);

        // Create a CSV version for easy analysis
        const csvContent = [
            'Publication,Article Count,Percentage',
            ...sortedPublications.map(([name, count]) => 
                `"${name.replace(/"/g, '""')}",${count},${((count / totalArticles) * 100).toFixed(2)}`
            )
        ].join('\n');

        fs.writeFileSync('publication-analysis.csv', csvContent);
        console.log('CSV results saved to: publication-analysis.csv');

    } catch (error) {
        console.error('Error during analysis:', error);
        process.exit(1);
    }
}

// Run the analysis
analyzePublications();
