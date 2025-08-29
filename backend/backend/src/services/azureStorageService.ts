import { BlobServiceClient } from '@azure/storage-blob';
import { getConfig } from '../utils/config';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private articlesContainer: string;
  private quotesContainer: string;
  private isInitialized: boolean = false;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    const config = getConfig();
    this.blobServiceClient = BlobServiceClient.fromConnectionString(config.azureStorage.connectionString);
    this.articlesContainer = config.azureStorage.articlesContainer;
    this.quotesContainer = config.azureStorage.quotesContainer;
  }

  /**
   * Health check for storage service
   */
  async healthCheck(containerName: string = this.articlesContainer): Promise<{
    ok: boolean;
    container?: string;
    quotesContainer?: string;
    blobPath?: string;
    bytesWritten?: number;
    roundTripMs?: number;
    error?: string;
    stage?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Ensure both containers exist
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      
      const quotesContainerClient = this.blobServiceClient.getContainerClient(this.quotesContainer);
      await quotesContainerClient.createIfNotExists();
      
      // Create health check blob path
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const blobPath = `health/${year}/${month}/${day}/${timestamp}.json`;
      
      // Write sentinel blob
      const sentinelData = {
        nowUtc: now.toISOString(),
        test: "storageHealth"
      };
      
      const jsonString = JSON.stringify(sentinelData, null, 2);
      const blobData = Buffer.from(jsonString, 'utf8');
      const bytesWritten = blobData.length;
      
      const blobClient = containerClient.getBlobClient(blobPath);
      const blockBlobClient = blobClient.getBlockBlobClient();
      await blockBlobClient.upload(blobData, blobData.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });
      
      // Read it back immediately
      const downloadResponse = await blobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody!);
      const readData = JSON.parse(content);
      
      // Verify data integrity
      if (readData.nowUtc !== sentinelData.nowUtc || readData.test !== sentinelData.test) {
        throw new Error('Data integrity check failed - read data does not match written data');
      }
      
      const roundTripMs = Date.now() - startTime;
      
      return {
        ok: true,
        container: containerName,
        quotesContainer: this.quotesContainer,
        blobPath,
        bytesWritten,
        roundTripMs
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Storage health check failed:', error);
      
      return {
        ok: false,
        error: errorMessage,
        stage: 'healthCheck'
      };
    }
  }

  /**
   * Initialize Azure Storage connection and create containers if they don't exist
   */
  async initializeAzureStorage(): Promise<void> {
    if (this.isInitialized) {
      console.log('Azure Storage already initialized');
      return;
    }

    try {
      // Create both containers
      await this.createBlobContainer(this.articlesContainer);
      await this.createBlobContainer(this.quotesContainer);
      this.isInitialized = true;
      console.log(`✅ Containers '${this.articlesContainer}' and '${this.quotesContainer}' are ready`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure Storage:', error);
      throw error;
    }
  }

  /**
   * Create a blob container if it doesn't exist
   */
  async createBlobContainer(containerName: string): Promise<void> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      console.log(`✅ Container '${containerName}' created or already exists`);
    } catch (error) {
      console.error(`❌ Failed to create container '${containerName}':`, error);
      throw error;
    }
  }

  /**
   * Write JSON data to a blob with retry logic
   */
  async writeJsonToBlob(containerName: string, blobName: string, data: any): Promise<void> {
    return this.executeWithRetry(async () => {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      const jsonString = JSON.stringify(data, null, 2);
      const blobData = Buffer.from(jsonString, 'utf8');
      
      const blockBlobClient = blobClient.getBlockBlobClient();
      await blockBlobClient.upload(blobData, blobData.length, {
        blobHTTPHeaders: {
          blobContentType: 'application/json'
        }
      });
      
      console.log(`✅ Successfully wrote data to blob: ${containerName}/${blobName}`);
    }, `write blob '${blobName}'`);
  }

  /**
   * Read JSON data from a blob with retry logic
   */
  async readJsonFromBlob(containerName: string, blobName: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      const downloadResponse = await blobClient.download();
      const content = await this.streamToString(downloadResponse.readableStreamBody!);
      
      return JSON.parse(content);
    }, `read blob '${blobName}'`);
  }

  /**
   * List all blobs in a container with retry logic
   */
  async listBlobs(containerName: string): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobs: string[] = [];
      
      for await (const blob of containerClient.listBlobsFlat()) {
        blobs.push(blob.name);
      }
      
      return blobs;
    }, `list blobs in container '${containerName}'`);
  }

  /**
   * Delete a blob with retry logic
   */
  async deleteBlob(containerName: string, blobName: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      await blobClient.delete();
      console.log(`✅ Successfully deleted blob: ${containerName}/${blobName}`);
    }, `delete blob '${blobName}'`);
  }

  /**
   * Check if a blob exists
   */
  async blobExists(containerName: string, blobName: string): Promise<boolean> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      const exists = await blobClient.exists();
      return exists;
    } catch (error) {
      console.error(`❌ Failed to check if blob '${blobName}' exists:`, error);
      return false;
    }
  }

  /**
   * Get blob metadata
   */
  async getBlobMetadata(containerName: string, blobName: string): Promise<any> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlobClient(blobName);
      
      const properties = await blobClient.getProperties();
      return {
        contentType: properties.contentType,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified,
        etag: properties.etag
      };
    } catch (error) {
      console.error(`❌ Failed to get metadata for blob '${blobName}':`, error);
      throw error;
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>, 
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.retryAttempts) {
          console.log(`⚠️ Attempt ${attempt} failed for ${operationName}, retrying in ${this.retryDelay}ms...`);
          await this.delay(this.retryDelay);
          this.retryDelay *= 2; // Exponential backoff
        }
      }
    }
    
    console.error(`❌ All ${this.retryAttempts} attempts failed for ${operationName}`);
    throw lastError!;
  }

  /**
   * Helper function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper function to convert stream to string
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

  /**
   * Get connection status
   */
  getConnectionStatus(): { isInitialized: boolean; articlesContainer: string; quotesContainer: string } {
    return {
      isInitialized: this.isInitialized,
      articlesContainer: this.articlesContainer,
      quotesContainer: this.quotesContainer
    };
  }
}

// Export singleton instance
export const azureStorageService = new AzureStorageService(); 