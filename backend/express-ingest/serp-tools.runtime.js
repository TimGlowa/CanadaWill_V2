'use strict';

const fs = require('fs');
const path = require('path');

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

    // 1) Single-person storing endpoint
    app.get('/api/news/serp/backfill', async (req, res) => {
      try {
        if (!serph || typeof serph.fetchNews !== 'function') {
          return res.status(500).json({ ok: false, error: 'serphouseClient.fetchNews not available' });
        }
        const who = String(req.query.who || '').trim();
        const days = Number(req.query.days || 365);
        const wantStore = String(req.query.store || '0') === '1';
        if (!who) return res.status(400).json({ ok: false, error: 'who is required' });

        const raw = await serph.fetchNews({ who, days });
        let stored = { stored: false };
        if (wantStore) stored = await maybeStoreRaw(who, { who, days, raw });

        return res.json({ ok: true, who, days, count: Array.isArray(raw) ? raw.length : 0, stored });
      } catch (e) {
        return res.status(500).json({ ok: false, error: (e && e.message) || String(e) });
      }
    });

    // 2) Full-roster storing endpoint
    app.get('/api/news/serp/backfill-roster', async (req, res) => {
      try {
        if (!serph || typeof serph.fetchNews !== 'function') {
          return res.status(500).json({ ok: false, error: 'serphouseClient.fetchNews not available' });
        }
        const days = Number(req.query.days || 365);
        const wantStore = String(req.query.store || '0') === '1';
        const rosterPath = process.env.ROSTER_PATH || 'data/ab-roster-transformed.json';
        if (!fs.existsSync(path.join(process.cwd(), rosterPath))) {
          return res.status(500).json({ ok: false, error: `roster file not found: ${rosterPath}` });
        }
        const roster = JSON.parse(fs.readFileSync(path.join(process.cwd(), rosterPath), 'utf8'));
        const officials = Array.isArray(roster) ? roster : (roster?.officials || []);
        let processed = 0, total = officials.length, saved = 0;

        for (const p of officials) {
          const who = p.fullName || p.name || p.slug || '';
          if (!who) continue;
          const raw = await serph.fetchNews({ who, days });
          if (wantStore) {
            const s = await maybeStoreRaw(who, { who, days, raw });
            if (s.stored) saved += 1;
          }
          processed += 1;
        }

        return res.json({ ok: true, days, processed, total, saved, container: process.env.ARTICLES_CONTAINER || 'news' });
      } catch (e) {
        return res.status(500).json({ ok: false, error: (e && e.message) || String(e) });
      }
    });
  };
})(module.exports);