const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    const startTime = Date.now();
    
    try {
        // Get connection string from environment
        const connectionString = process.env.AzureWebJobsStorage;
        if (!connectionString) {
            throw new Error('AzureWebJobsStorage connection string not found');
        }

        // Initialize blob storage
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerName = 'articles';
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure container exists
        await containerClient.createIfNotExists();

        // Create sentinel blob path
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = now.getTime();
        
        const blobPath = `health/${year}/${month}/${day}/sentinel-${timestamp}.json`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

        // Write sentinel data
        const sentinelData = {
            timestamp: now.toISOString(),
            type: 'health-check',
            message: 'Storage health check sentinel',
            version: '1.0'
        };

        const writeStart = Date.now();
        await blockBlobClient.upload(JSON.stringify(sentinelData, null, 2), JSON.stringify(sentinelData, null, 2).length);
        const writeTime = Date.now() - writeStart;

        // Read sentinel data back
        const readStart = Date.now();
        const downloadResponse = await blockBlobClient.download();
        const downloadedContent = await downloadResponse.contentAsString();
        const readTime = Date.now() - readStart;

        // Verify content
        const downloadedData = JSON.parse(downloadedContent);
        if (downloadedData.timestamp !== sentinelData.timestamp) {
            throw new Error('Sentinel data verification failed');
        }

        const totalTime = Date.now() - startTime;

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                ok: true,
                blobPath,
                writeTimeMs: writeTime,
                readTimeMs: readTime,
                roundTripMs: totalTime,
                timestamp: now.toISOString(),
                message: 'Storage health check completed successfully'
            }
        };

    } catch (error) {
        const totalTime = Date.now() - startTime;
        
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                ok: false,
                error: error.message,
                roundTripMs: totalTime,
                timestamp: new Date().toISOString()
            }
        };
    }
}; 