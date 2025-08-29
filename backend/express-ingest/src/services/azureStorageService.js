const { BlobServiceClient } = require('@azure/storage-blob');

class AzureStorageService {
  constructor(connectionString, containerName = 'articles') {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerName = containerName;
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  async ensureContainerExists() {
    try {
      await this.containerClient.createIfNotExists();
      console.log(`Container '${this.containerName}' is ready`);
    } catch (error) {
      console.error(`Error ensuring container exists: ${error.message}`);
      throw error;
    }
  }

  async storeRawArticle(personSlug, serphouseResponse, page = 1) {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      
      // Match existing structure: articles/danielle-smith/2025/08/18/serphouse_<timestamp>Z_page<P>.json
      const blobPath = `${personSlug}/${year}/${month}/${day}/serphouse_${timestamp}Z_page${page}.json`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      
      const content = JSON.stringify(serphouseResponse, null, 2);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });
      
      console.log(`Stored raw article for ${personSlug} at ${blobPath}`);
      return blobPath;
      
    } catch (error) {
      console.error(`Error storing raw article for ${personSlug}: ${error.message}`);
      throw error;
    }
  }

  async storeRunSummary(summary) {
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const blobPath = `runs/${timestamp}Z.json`;
      const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
      
      const content = JSON.stringify(summary, null, 2);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });
      
      console.log(`Stored run summary at ${blobPath}`);
      return blobPath;
      
    } catch (error) {
      console.error(`Error storing run summary: ${error.message}`);
      throw error;
    }
  }

  async storePersonResults(person, serphouseResult) {
    try {
      if (!serphouseResult.success || !serphouseResult.results) {
        console.log(`No results to store for ${person.slug}`);
        return [];
      }

      const storedPaths = [];
      
      // Store each page of results
      for (let page = 1; page <= serphouseResult.pages; page++) {
        const pageResults = serphouseResult.results.slice((page - 1) * 50, page * 50);
        
        if (pageResults.length > 0) {
          const pageResponse = {
            ...serphouseResult,
            results: pageResults,
            currentPage: page
          };
          
          const path = await this.storeRawArticle(person.slug, pageResponse, page);
          storedPaths.push(path);
        }
      }
      
      return storedPaths;
      
    } catch (error) {
      console.error(`Error storing results for ${person.slug}: ${error.message}`);
      throw error;
    }
  }

  async getContainerStats() {
    try {
      let totalBlobs = 0;
      let totalSize = 0;
      
      for await (const blob of this.containerClient.listBlobsFlat()) {
        totalBlobs++;
        totalSize += blob.properties.contentLength || 0;
      }
      
      return {
        containerName: this.containerName,
        totalBlobs,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
      };
      
    } catch (error) {
      console.error(`Error getting container stats: ${error.message}`);
      return { error: error.message };
    }
  }
}

module.exports = AzureStorageService;

