const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');

// Azure Storage configuration
const connectionString = process.env.AZURE_STORAGE_CONNECTION;
const containerName = 'news';

async function analyzePublications() {
    if (!connectionString) {
        console.error('AZURE_STORAGE_CONNECTION environment variable not set');
        process.exit(1);
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    const publicationCounts = new Map();
    let totalArticles = 0;
    let processedOfficials = 0;
    let errorCount = 0;

    console.log('Starting publication frequency analysis...');
    console.log('Reading articles from Azure Storage...\n');

    try {
        // List all blobs in the raw/serp directory
        const listOptions = {
            prefix: 'raw/serp/'
        };

        for await (const blob of containerClient.listBlobsFlat(listOptions)) {
            // Skip directory markers (they end with /)
            if (blob.name.endsWith('/')) continue;
            
            // Only process JSON files
            if (!blob.name.endsWith('.json')) continue;

            try {
                // Download and parse the blob
                const downloadResponse = await containerClient.getBlockBlobClient(blob.name).download();
                const content = await streamToString(downloadResponse.readableStreamBody);
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
                    if (article && article.source) {
                        const publication = article.source;
                        publicationCounts.set(publication, (publicationCounts.get(publication) || 0) + 1);
                        totalArticles++;
                    }
                }

                processedOfficials++;
                if (processedOfficials % 10 === 0) {
                    console.log(`Processed ${processedOfficials} officials...`);
                }

            } catch (error) {
                console.error(`Error processing ${blob.name}:`, error.message);
                errorCount++;
            }
        }

        // Sort publications by frequency (descending)
        const sortedPublications = Array.from(publicationCounts.entries())
            .sort((a, b) => b[1] - a[1]);

        // Display results
        console.log('\n=== PUBLICATION FREQUENCY ANALYSIS ===');
        console.log(`Total articles analyzed: ${totalArticles}`);
        console.log(`Officials processed: ${processedOfficials}`);
        console.log(`Errors encountered: ${errorCount}`);
        console.log(`Unique publications: ${publicationCounts.size}\n`);

        console.log('Top 50 Publications by Article Count:');
        console.log('=====================================');
        console.log('Publication'.padEnd(50) + 'Articles'.padStart(10));
        console.log('-'.repeat(60));

        sortedPublications.slice(0, 50).forEach(([publication, count]) => {
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
                processedOfficials,
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

        fs.writeFileSync('publication-analysis.json', JSON.stringify(results, null, 2));
        console.log('\nDetailed results saved to: publication-analysis.json');

    } catch (error) {
        console.error('Error during analysis:', error);
        process.exit(1);
    }
}

function streamToString(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data.toString());
        });
        readableStream.on('end', () => {
            resolve(chunks.join(''));
        });
        readableStream.on('error', reject);
    });
}

// Run the analysis
analyzePublications().catch(console.error);


