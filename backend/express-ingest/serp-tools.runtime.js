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

    // === Start roster in background ===
    app.get('/api/news/serp/backfill-roster/start', async (req,res)=>{
      if(!serph || typeof serph.fetchNews!=='function'){
        return res.status(500).json({ok:false,error:'serphouseClient not available'});
      }
      const days = Number(req.query.days||365);
      const delayMs = Number(req.query.delayMs||300);
      const rosterPath = process.env.ROSTER_PATH || 'data/ab-roster-transformed.json';
      const runId = new Date().toISOString().replace(/[:.]/g,'-');
      const container = process.env.ARTICLES_CONTAINER || 'news';

      // Load roster
      const abs = path.join(process.cwd(), rosterPath);
      if(!fs.existsSync(abs)) return res.status(500).json({ok:false,error:`roster not found: ${rosterPath}`});
      const roster = JSON.parse(fs.readFileSync(abs,'utf8'));
      const officials = Array.isArray(roster)? roster : (roster?.officials||[]);
      const total = officials.length;

      // Kick off background loop (no await)
      (async ()=>{
        const { BlobServiceClient } = require('@azure/storage-blob');
        const bsc = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION);
        const cc  = bsc.getContainerClient(container);
        await cc.createIfNotExists(); // ensure container
        const trackerKey = `tracker/roster-${runId}.json`;

        const state = { ok:true, runId, days, total, processed:0, lastSlug:null, startedAt:new Date().toISOString(), updatedAt:null };
        async function saveTracker(){
          state.updatedAt = new Date().toISOString();
          const buf = Buffer.from(JSON.stringify(state,null,2),'utf8');
          await cc.getBlockBlobClient(trackerKey).upload(buf, buf.length, { blobHTTPHeaders:{ blobContentType:'application/json' }});
        }
        await saveTracker();

        for(const p of officials){
          const who = p.fullName || p.name || p.slug || '';
          if(!who) continue;
          try{
            const raw = await serph.fetchNews({ who, days });
            if(Array.isArray(raw)){
              // relying on existing maybeStoreRaw if available at root; fall back to direct write here:
              const ts = new Date().toISOString().replace(/[:.]/g,'-');
              const key = `raw/serp/${(p.slug||who).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}/${ts}.json`;
              const buf = Buffer.from(JSON.stringify({ who, days, raw }, null, 2),'utf8');
              await cc.getBlockBlobClient(key).upload(buf, buf.length, { blobHTTPHeaders:{ blobContentType:'application/json' }});
            }
          }catch(_){} // continue
          state.processed += 1;
          state.lastSlug = p.slug || who;
          await saveTracker();
          await sleep(delayMs);
        }
      })().catch(()=>{});

      return res.status(202).json({ ok:true, message:'Roster backfill started', runId, days, delayMs, total });
    });

    // === Simple progress reader ===
    app.get('/api/news/serp/backfill-roster/progress', async (req,res)=>{
      try{
        const runId = String(req.query.runId||'').trim();
        if(!runId) return res.status(400).json({ok:false,error:'runId required'});
        const { BlobServiceClient } = require('@azure/storage-blob');
        const bsc = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION);
        const cc  = bsc.getContainerClient(process.env.ARTICLES_CONTAINER || 'news');
        const key = `tracker/roster-${runId}.json`;
        const dl = await cc.getBlockBlobClient(key).download();
        const body = await streamToString(dl.readableStreamBody);
        return res.json(JSON.parse(body));
      }catch(e){
        return res.status(404).json({ok:false,error:'not found'});
      }
    });

    async function streamToString(readable){
      return await new Promise((resolve,reject)=>{
        const chunks=[]; readable.on('data',d=>chunks.push(d));
        readable.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
        readable.on('error',reject);
      });
    }

    function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
  };
})(module.exports);