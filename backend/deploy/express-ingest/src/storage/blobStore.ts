import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

export class BlobStore {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION || process.env.AzureWebJobsStorage;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION or AzureWebJobsStorage environment variable is required');
    }

    this.containerName = process.env.ARTICLES_CONTAINER || 'articles';
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  getContainerName(): string {
    return this.containerName;
  }

  /**
   * Write JSON data to blob storage with retry logic
   */
  async writeJson(container: string, path: string, data: any, retries: number = 3): Promise<void> {
    console.log(`[BLOB] Writing JSON to container: ${container}, path: ${path}`);
    
    try {
      const containerClient = this.blobServiceClient.getContainerClient(container);
      const blockBlobClient = containerClient.getBlockBlobClient(path);
      
      // Convert data to JSON string
      const jsonString = JSON.stringify(data, null, 2);
      const buffer = Buffer.from(jsonString, 'utf8');
      
      console.log(`[BLOB] Data size: ${buffer.length} bytes`);
      
      // Upload with retry logic
      let lastError: any;
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`[BLOB] Upload attempt ${attempt}/${retries} for ${container}/${path}`);
          
          await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: {
              blobContentType: 'application/json'
            }
          });
          
          console.log(`[BLOB] Successfully uploaded ${container}/${path} on attempt ${attempt}`);
          return;
          
        } catch (error: any) {
          lastError = error;
          console.error(`[BLOB] Upload attempt ${attempt} failed for ${container}/${path}:`, error.message);
          
          if (attempt < retries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`[BLOB] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // All attempts failed
      throw new Error(`Failed to upload ${container}/${path} after ${retries} attempts: ${lastError.message}`);
      
    } catch (error: any) {
      console.error(`[BLOB] Critical error writing ${container}/${path}:`, error.message);
      throw error;
    }
  }

  async exists(container: string, path: string): Promise<boolean> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(container);
      const blockBlobClient = containerClient.getBlockBlobClient(path);
      await blockBlobClient.getProperties();
      return true;
    } catch (error) {
      return false;
    }
  }

  hashUrl(url: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha1').update(url.toLowerCase()).digest('hex');
  }

  generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  generateRunId(): string {
    return new Date().toISOString().replace(/[:.]/g, '-');
  }

  // Helper method to build blob paths according to the specified schema
  buildRawBlobPath(slug: string, source: string, timestamp: string): string {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `ingest/${year}/${month}/${day}/${slug}/${source}/${timestamp}.json`;
  }

  buildArticleBlobPath(slug: string, url: string): string {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const urlHash = this.hashUrl(url);
    
    return `${slug}/${year}/${month}/${day}/${urlHash}.json`;
  }

  buildSummaryBlobPath(slug: string, runId: string): string {
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `index/${slug}/${year}/${month}/${day}/${runId}.summary.json`;
  }

  /**
   * List blobs in a directory
   */
  async listBlobs(prefix: string): Promise<any[]> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobs: any[] = [];
      
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        blobs.push({
          name: blob.name,
          size: blob.properties.contentLength,
          lastModified: blob.properties.lastModified
        });
      }
      
      return blobs;
    } catch (error: any) {
      console.error('Error listing blobs:', error);
      throw new Error(`Failed to list blobs: ${error.message}`);
    }
  }

  /**
   * Read JSON content from a blob
   */
  async readJson(blobName: string): Promise<any> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      const response = await blobClient.download();
      const content = await this.streamToString(response.readableStreamBody!);
      
      return JSON.parse(content);
    } catch (error: any) {
      console.error('Error reading blob:', error);
      throw new Error(`Failed to read blob: ${error.message}`);
    }
  }

  /**
   * Helper method to convert stream to string
   */
  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (data) => {
        chunks.push(Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      readableStream.on('error', reject);
    });
  }
} 