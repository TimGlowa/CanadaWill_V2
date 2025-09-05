'use strict';
module.exports = function(app){
  // KISS: inline backfill logic here to avoid the compiled dist client path
  const fs = require('fs');
  const path = require('path');
  const axios = require('axios');
  const { BlobServiceClient } = require('@azure/storage-blob');

  const CONN       = process.env.AZURE_STORAGE_CONNECTION;
  const SERP_TOKEN = process.env.SERPHOUSE_API_TOKEN;
  const ROSTER_REL = process.env.ROSTER_PATH; // must be "data/ab-roster-transformed.json"
  const CONTAINER  = 'news';                  // hard-coded per direction
  if (!CONN)       throw new Error('AZURE_STORAGE_CONNECTION missing');
  if (!SERP_TOKEN) throw new Error('SERPHOUSE_API_TOKEN missing');
  if (!ROSTER_REL) throw new Error('ROSTER_PATH missing (expected "data/ab-roster-transformed.json")');

  // PRD §2.2 explicit keywords (quoted phrases treated as phrases)
  const SEPARATION_TERMS = [
    "Alberta separation","Alberta independence","Alberta sovereignty","Sovereignty Act",
    "referendum","secede","secession","leave Canada","break from Canada",
    "Alberta Prosperity Project","Forever Canada","Forever Canadian"
  ];
  const UNITY_TERMS = [
    "remain in Canada","stay in Canada","support Canada","oppose separation",
    "oppose independence","pro-Canada stance","keep Alberta in Canada"
  ];
  const TERMS = [...SEPARATION_TERMS, ...UNITY_TERMS];

  function buildQuery(fullName, office){
    const expr = TERMS.map(t => `"${t}"`).join(' OR ');
    return `"${fullName}" "${office}" AND (${expr})`;
  }
  function parseNewsDate(s){
    if (!s) return null;
    const str = String(s).trim();
    const m = str.match(/^(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/i);
    if (m){
      const n=+m[1], u=m[2].toLowerCase();
      const ms = u.startsWith('minute')? n*60_000 :
                 u.startsWith('hour')  ? n*3_600_000 :
                 u.startsWith('day')   ? n*86_400_000 :
                 u.startsWith('week')  ? n*7*86_400_000 :
                 u.startsWith('month') ? n*30*86_400_000 :
                 u.startsWith('year')  ? n*365*86_400_000 : 0;
      return new Date(Date.now()-ms);
    }
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function jitter(){ return 900 + Math.floor(Math.random()*700); }
  async function streamToBuffer(readable){ const a=[]; for await (const c of readable) a.push(Buffer.from(c)); return Buffer.concat(a); }
  async function readDay(container, slug, y, m, d){
    const name = `raw/serp/${slug}/${y}/${m}/${d}.json`;
    try { const dl=await container.getBlobClient(name).download(); const buf=await streamToBuffer(dl.readableStreamBody);
          return JSON.parse(buf.toString('utf8')); } catch { return { meta:{ slug, day:`${y}-${m}-${d}` }, articles: [] }; }
  }
  async function writeDay(container, slug, y, m, d, items){
    const name = `raw/serp/${slug}/${y}/${m}/${d}.json`;
    const body = JSON.stringify({ meta:{ slug, day:`${y}-${m}-${d}`, count: items.length }, articles: items });
    const client = container.getBlockBlobClient(name);
    await client.deleteIfExists();
    await client.upload(body, Buffer.byteLength(body), { blobHTTPHeaders:{ blobContentType:'application/json' } });
  }
  async function fetchAllSERP(q){
    const url='https://api.serphouse.com/serp/live';
    const headers={ Authorization:`Bearer ${SERP_TOKEN}` };
    const minDate = new Date(Date.now() - 365*86_400_000); // fixed 12 months
    const seen=new Set(); const buckets=new Map();
    let page=1, backoff=1500, total=0;
    for(;;){
      try{
        const { data } = await axios.post(url, { q, domain:'google.ca', lang:'en', device:'desktop', tbm:'nws', num:100, page },
                                          { headers, timeout: 60_000 });
        const news = data?.results?.news || [];
        if (!news.length) break;
        let fresh=0;
        for (const it of news){
          const dt = parseNewsDate(it.time || it.date || it.published_time);
          if (!dt || dt < minDate) continue;
          const u = (it.url || it.link || '').trim();
          if (!u || seen.has(u)) continue;
          seen.add(u);
          const y=dt.getFullYear(), m=String(dt.getMonth()+1).padStart(2,'0'), d=String(dt.getDate()).padStart(2,'0');
          const key=`${y}/${m}/${d}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(it);
          fresh++; total++;
        }
        if (fresh===0) break;
        page++; if (page>200) break;
        backoff=1500;
        await sleep(250);
      }catch(e){
        const s=e?.response?.status||0;
        if (s===429 || s===503){ await sleep(backoff); backoff=Math.min(backoff*2,20_000); continue; }
        throw e;
      }
    }
    return { total, buckets };
  }
  async function writeDay(container, slug, y, m, d, items){
    const name = `raw/serp/${slug}/${y}/${m}/${d}.json`;
    const body = JSON.stringify({ meta:{ slug, day:`${y}-${m}-${d}`, count: items.length }, articles: items });
    const client = container.getBlockBlobClient(name);
    await client.deleteIfExists();
    await client.upload(body, Buffer.byteLength(body), { blobHTTPHeaders:{ blobContentType:'application/json' } });
  }
  async function fetchAll(q){
    const url='https://api.serphouse.com/serp/live';
    const headers={ Authorization:`Bearer ${SERP_TOKEN}` };
    const minDate = new Date(Date.now() - 365*86_400_000); // fixed 12 months
    const seen=new Set(); const buckets=new Map();
    let page=1, backoff=1500, total=0;
    for(;;){
      try{
        const { data } = await axios.post(url, { q, domain:'google.ca', lang:'en', device:'desktop', tbm:'nws', num:100, page },
                                          { headers, timeout:60_000 });
        const news = data?.results?.news || [];
        if (!news.length) break;
        let fresh=0;
        for (const it of news){
          const dt = parseNewsDate(it.time || it.date || it.published_time);
          if (!dt || dt < minDate) continue;
          const u = (it.url || it.link || '').trim();
          if (!u || seen.has(u)) continue;
          seen.add(u);
          const y=dt.getFullYear(), m=String(dt.getMonth()+1).padStart(2,'0'), d=String(dt.getDate()).padStart(2,'0');
          const key=`${y}/${m}/${d}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(it);
          fresh++; total++;
        }
        if (fresh===0) break;
        page++; if (page>200) break;
        backoff=1500;
        await sleep(250);
      }catch(e){
        const s=e?.response?.status||0;
        if (s===429 || s===503){ await sleep(backoff); backoff=Math.min(backoff*2,20_000); continue; }
        throw e;
      }
    }
    return { total, buckets };
  }

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

  // KISS: unify backfill here using ROSTER_PATH + PRD terms + 12mo + no caps. Logs each call.
  app.get('/api/news/serp/backfill', async (req, res) => {
    try {
      const slug = String(req.query.who || '').trim();
      if (!slug) return res.status(400).json({ ok:false, error:'missing who' });

      const rosterPath = path.resolve(process.cwd(), process.env.ROSTER_PATH);
      const raw = JSON.parse(fs.readFileSync(rosterPath,'utf8'));
      const arr = Array.isArray(raw) ? raw : (raw.officials || []);
      const rec = arr.find(r => r && (r.slug === slug || (r.fullName||'').toLowerCase() === slug.toLowerCase()));
      if (!rec) return res.status(400).json({ ok:false, error:`slug not in roster: ${slug}` });

      const q = buildQuery(rec.fullName, rec.office || '');
      console.log(`[backfill] slug=${slug} q=${q}`);

      const svc = BlobServiceClient.fromConnectionString(CONN);
      const container = svc.getContainerClient(CONTAINER);
      await container.createIfNotExists();

      const { total, buckets } = await fetchAll(q);
      for (const [key, items] of buckets.entries()){
        const [y,m,d] = key.split('/');
        // merge with any existing for that day
        const existing = await readDay(container, slug, y, m, d);
        const merged = (existing.articles || []).concat(items);
        await writeDay(container, slug, y, m, d, merged);
      }
      return res.json({ ok:true, who:slug, count: total });
    } catch (err) {
      console.error('[backfill] error', err?.message || err);
      return res.status(500).json({ ok:false, error: String(err?.message || err) });
    }
  });

  app.get('/api/news/serp/refresh', async (req,res)=>{
    // identical shape to backfill; tune days smaller if you like
    req.query.days = req.query.days || '3';
    return app._router.handle(req, res); // re-use the same handler
  });

  // Boot log for the admin roster-runner
  console.log('[BOOT] route: GET /api/admin/backfill');

  // Streams "[i/121] slug … OK count=…" as plain text while iterating roster
  app.get('/api/admin/backfill', async (req, res) => {
    try {
      const rosterPath = path.resolve(process.cwd(), ROSTER_REL);
      if (!fs.existsSync(rosterPath)) return res.status(500).send(`Roster not found at ${rosterPath}`);
      const raw = JSON.parse(fs.readFileSync(rosterPath,'utf8'));
      const officials = (Array.isArray(raw) ? raw : (raw.officials || []))
        .filter(x => x && x.slug && x.fullName && x.office);

      res.setHeader('Content-Type','text/plain; charset=utf-8');
      res.setHeader('Cache-Control','no-cache');
      res.setHeader('Connection','keep-alive');

      const svc = BlobServiceClient.fromConnectionString(CONN);
      const container = svc.getContainerClient(CONTAINER);
      await container.createIfNotExists();

      res.write(`Backfilling ${officials.length} officials → container "${CONTAINER}" (12 months, no caps)\n`);

      let i=0, grand=0;
      for (const o of officials) {
        await sleep(jitter());
        res.write(`[${++i}/${officials.length}] ${o.slug} … `);
        const q = buildQuery(o.fullName, o.office || '');
        const { total, buckets } = await fetchAllSERP(q);
        if (total > 0){
          for (const [key, items] of buckets.entries()){
            const [y,m,d] = key.split('/');
            // merge any existing day file
            const existing = await readDay(container, o.slug, y, m, d);
            const merged = (existing.articles || []).concat(items);
            await writeDay(container, o.slug, y, m, d, merged);
          }
          grand += total;
          res.write(`OK count=${total}\n`);
        } else {
          res.write(`OK count=0\n`);
        }
      }
      res.write(`Backfill complete. Total stored: ${grand}\n`);
      res.end();
    } catch (err) {
      res.status(500).send(String(err?.message || err));
    }
  });
};
