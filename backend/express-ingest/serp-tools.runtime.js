'use strict';
module.exports = function(app){
  // Env (does not leak secrets)
  app.get('/api/news/serp/env', (_req,res)=>{
    res.json({
      ENABLE_SERPHOUSE: process.env.ENABLE_SERPHOUSE === 'true',
      HAS_TOKEN: !!process.env.SERPHOUSE_API_TOKEN,
      ROSTER_PATH: process.env.ROSTER_PATH || 'data/ab-roster-transformed.json',
      STORAGE: {
        hasConn: !!process.env.AZURE_STORAGE_CONNECTION,
        // KISS: default to "news" (was "articles")
        container: process.env.ARTICLES_CONTAINER || 'news'
      }
    });
  });

  app.get('/api/news/serp/selftest', (_req,res)=>{
    try{
      const mod = require('./dist/providers/serphouseClient');
      res.json({ ok:true, found:true, keys:Object.keys(mod||{}), defaultIsFn: !!(mod && mod.default && typeof mod.default==='function') });
    }catch(e){
      res.status(500).json({ ok:false, found:false, error: (e && e.message) || String(e) });
    }
  });
};

// ---- add working SERPHouse routes (raw + optional store) ----
module.exports = (function(orig){
  return function(app){
    if (orig) orig(app);

    const serph = require('./dist/providers/serphouseClient');
    const hasBlob = !!process.env.AZURE_STORAGE_CONNECTION;
    let BlobServiceClient = null;
    if (hasBlob) {
      try { BlobServiceClient = require('@azure/storage-blob').BlobServiceClient; } catch(_) {}
    }

    function slugify(s){
      return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    }

    async function maybeStoreRaw(who, payload){
      if (!hasBlob || !BlobServiceClient) return { stored:false, reason:'no storage lib/conn' };
      const conn = process.env.AZURE_STORAGE_CONNECTION;
      const container = process.env.ARTICLES_CONTAINER || 'news'; // KISS: default "news"
      const bsc = BlobServiceClient.fromConnectionString(conn);
      const cc = bsc.getContainerClient(container);
      try { await cc.createIfNotExists(); } catch (_) {}

      const whoSlug = slugify(who);
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const key = `raw/serp/${whoSlug}/${ts}.json`;

      const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
      await cc.getBlockBlobClient(key).upload(body, body.length, { blobHTTPHeaders: { blobContentType: 'application/json' }});
      return { stored:true, container, key };
    }

    // existing route implementations remain unchanged…
  };
})(module.exports);