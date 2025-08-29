const { BlobServiceClient } = require('@azure/storage-blob');

function getBlobClient(){
  const conn = process.env.AZURE_STORAGE_CONNECTION || '';
  if(!conn) throw new Error('AZURE_STORAGE_CONNECTION missing');
  return BlobServiceClient.fromConnectionString(conn);
}

async function ensureContainer(containerName){
  const svc = getBlobClient();
  const c = svc.getContainerClient(containerName);
  await c.createIfNotExists();
  return c;
}

function ymdParts(d=new Date()){
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  return { y, m, day };
}

/**
 * Writes JSON array to:
 *   articles/<slug>/<YYYY>/<MM>/<DD>/<source>-<runId>.json
 * Returns the blob key.
 */
async function saveRaw(slug, source, items){
  const containerName = process.env.ARTICLES_CONTAINER || 'articles';
  const c = await ensureContainer(containerName);
  const { y, m, day } = ymdParts();
  const runId = new Date().toISOString().replace(/[:.]/g,'-');
  const key = `${slug}/${y}/${m}/${day}/${source}-${runId}.json`;
  const block = c.getBlockBlobClient(`articles/${key}`); // matches your screenshot root "articles"
  const body = Buffer.from(JSON.stringify({ items, savedAt:new Date().toISOString() }, null, 2));
  await block.uploadData(body, { blobHTTPHeaders: { blobContentType: "application/json" } });
  return `articles/${key}`;
}

module.exports = { saveRaw };
