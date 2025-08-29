'use strict';
module.exports = function(app){
  // Health/debug already present in your live copy; keep them.
  app.get('/api/news/serp/env', (_req,res)=>{
    res.json({
      ENABLE_SERPHOUSE: process.env.ENABLE_SERPHOUSE === 'true',
      HAS_TOKEN: !!process.env.SERPHOUSE_API_TOKEN,
      ROSTER_PATH: process.env.ROSTER_PATH || 'data/ab-roster-transformed.json',
      STORAGE: {
        hasConn: !!process.env.AZURE_STORAGE_CONNECTION,
        container: process.env.ARTICLES_CONTAINER || 'articles'
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

  // Backfill/refresh with optional ?q= override
  app.get('/api/news/serp/backfill', async (req,res)=>{
    try{
      const who   = String(req.query.who || req.query.slug || '').trim();
      const days  = Number(req.query.days || 365);
      const limit = Number(req.query.limit || 50);
      const store = String(req.query.store || '') === '1';
      const q     = req.query.q ? String(req.query.q) : undefined;

      const serph = require('./dist/providers/serphouseClient');
      const raw = await serph.fetchNews({ who, days, limit, qOverride: q });

      let stored = { stored:false };
      if (store) {
        const { BlobServiceClient } = require('@azure/storage-blob');
        const bsc = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION);
        const cc  = bsc.getContainerClient(process.env.ARTICLES_CONTAINER || 'articles');
        await cc.createIfNotExists();
        const ts  = new Date().toISOString().replace(/[:.]/g,'-');
        const key = `raw/serp/${who}/${ts}.json`;
        await cc.getBlockBlobClient(key).upload(JSON.stringify({who,days,limit,raw},null,2), Buffer.byteLength(JSON.stringify({who,days,limit,raw})));
        stored = { stored:true, container: cc.containerName, key };
      }

      res.json({ ok:true, who, days, limit, stored, count: raw?.length ?? 0, raw });
    }catch(e){
      res.status(500).json({ ok:false, error: (e && e.message) || String(e) });
    }
  });

  app.get('/api/news/serp/refresh', async (req,res)=>{
    // identical shape to backfill; tune days smaller if you like
    req.query.days = req.query.days || '3';
    return app._router.handle(req, res); // re-use the same handler
  });
};
