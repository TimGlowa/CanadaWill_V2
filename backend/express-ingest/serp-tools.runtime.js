'use strict';
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = (app) => {
  // existing routes are registered above…
  
  // ------------------------------------------------------------
  // KISS CONFIG (already in your env)
  const CONN       = process.env.AZURE_STORAGE_CONNECTION;
  const SERP_TOKEN = process.env.SERPHOUSE_API_TOKEN;
  const ROSTER_REL = process.env.ROSTER_PATH; // MUST be "data/ab-roster-transformed.json"
  const CONTAINER  = 'news';
  if (!CONN)       throw new Error('AZURE_STORAGE_CONNECTION missing');
  if (!SERP_TOKEN) throw new Error('SERPHOUSE_API_TOKEN missing');
  if (!ROSTER_REL) throw new Error('ROSTER_PATH missing (expected "data/ab-roster-transformed.json")');

  // PRD §2.2 — explicit term sets (treat quoted items as phrases)
  const SEPARATION_TERMS = [
    "Alberta separation",
    "Alberta independence",
    "Alberta sovereignty",
    "Sovereignty Act",
    "referendum",
    "secede",
    "secession",
    "leave Canada",
    "break from Canada",
    "Alberta Prosperity Project",
    "Forever Canada",
    "Forever Canadian"
  ];
  const UNITY_TERMS = [
    "remain in Canada",
    "stay in Canada",
    "support Canada",
    "oppose separation",
    "oppose independence",
    "pro-Canada stance",
    "keep Alberta in Canada"
  ];
  const TERMS = [...SEPARATION_TERMS, ...UNITY_TERMS];
  const buildQuery = (fullName, office) => {
    const expr = TERMS.map(t => `"${t}"`).join(' OR ');
    return `"${fullName}" "${office}" AND (${expr})`;
  };
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const jitter = () => Math.random() * 1000 + 500; // 500-1500ms

  const parseNewsDate = (s) => {
    if (!s) return null;
    const str = String(s).trim();
    const m = str.match(/^(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/i);
    if (m) {
      const n = +m[1], u = m[2].toLowerCase();
      const ms = u.startsWith('minute') ? n * 60_000 :
                 u.startsWith('hour')   ? n * 3_600_000 :
                 u.startsWith('day')    ? n * 86_400_000 :
                 u.startsWith('week')   ? n * 7 * 86_400_000 :
                 u.startsWith('month')  ? n * 30 * 86_400_000 :
                 u.startsWith('year')   ? n * 365 * 86_400_000 : 0;
      return new Date(Date.now() - ms);
    }
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  const streamToBuffer = async (readableStream) => {
    const chunks = [];
    for await (const chunk of readableStream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  };

  const readDay = async (container, slug, year, month, day) => {
    try {
      const blobName = `raw/serp/${slug}/${year}/${month}/${day}.json`;
      const blob = container.getBlobClient(blobName);
      const exists = await blob.exists();
      if (!exists) return { articles: [] };
      const stream = await blob.download();
      const buffer = await streamToBuffer(stream.readableStreamBody);
      return JSON.parse(buffer.toString());
    } catch (err) {
      return { articles: [] };
    }
  };

  const writeDay = async (container, slug, year, month, day, data) => {
    const blobName = `raw/serp/${slug}/${year}/${month}/${day}.json`;
    const blob = container.getBlobClient(blobName);
    await blob.upload(JSON.stringify(data, null, 2), JSON.stringify(data, null, 2).length);
  };

  const fetchAllSERP = async (query) => {
    const buckets = new Map();
    let total = 0;
    let page = 1;
    const seen = new Set();
    
    while (page <= 200) { // guardrail
      try {
        const response = await axios.get('https://api.serphouse.com/serp/live', {
          params: {
            q: query,
            domain: 'google.com',
            loc: 'Alberta,Canada',
            device: 'desktop',
            num: 100,
            page: page,
            api_key: SERP_TOKEN
          },
          timeout: 30000
        });
        
        const results = response.data?.results || [];
        if (results.length === 0) break;
        
        for (const item of results) {
          if (!item.link || seen.has(item.link)) continue;
          seen.add(item.link);
          
          const date = parseNewsDate(item.date);
          if (!date) continue;
          
          const now = new Date();
          const diffDays = (now - date) / (1000 * 60 * 60 * 24);
          if (diffDays > 365) continue;
          
          const key = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(item);
          total++;
        }
        
        page++;
        await sleep(jitter());
        
      } catch (err) {
        if (err.response?.status === 429 || err.response?.status === 503) {
          await sleep(5000 + Math.random() * 5000);
          continue;
        }
        throw err;
      }
    }
    
    return { total, buckets };
  };

  // (A) Per-official JSON: handle the route directly with proper logic
  app.get('/api/news/serp/backfill', async (req, res) => {
    try {
      const slug = String(req.query.who || '').trim();
      if (!slug) {
        return res.status(400).json({ error: 'Missing required parameter: who' });
      }

      // Load roster to validate the slug
      const rosterPath = path.resolve(process.cwd(), ROSTER_REL);
      if (!fs.existsSync(rosterPath)) {
        return res.status(500).json({ error: `Roster not found at ${rosterPath}` });
      }
      
      const raw = JSON.parse(fs.readFileSync(rosterPath, 'utf8'));
      const officials = Array.isArray(raw) ? raw : (raw.officials || []);
      const official = officials.find(o => o.slug === slug);
      
      if (!official) {
        return res.status(404).json({ error: `Official not found: ${slug}` });
      }

      // Build query and fetch results
      const query = buildQuery(official.fullName, official.office || '');
      const { total, buckets } = await fetchAllSERP(query);
      
      // Store results
      const svc = BlobServiceClient.fromConnectionString(CONN);
      const container = svc.getContainerClient(CONTAINER);
      await container.createIfNotExists();
      
      let storedCount = 0;
      if (total > 0) {
        for (const [key, items] of buckets.entries()) {
          const [y, m, d] = key.split('/');
          const existing = await readDay(container, slug, y, m, d);
          const merged = (existing.articles || []).concat(items);
          await writeDay(container, slug, y, m, d, { articles: merged });
          storedCount += items.length;
        }
      }

      console.log(`[backfill] who=${slug} status=200 count=${total} stored=${storedCount}`);
      
      res.json({
        ok: true,
        who: slug,
        days: 365,
        limit: 'unlimited',
        q: query,
        vendor_status: 200,
        count: total,
        stored: {
          stored: true,
          container: CONTAINER,
          count: storedCount
        }
      });
      
    } catch (err) {
      console.error(`[backfill] error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // (B) Roster-looping runner with progress stream: reuse existing route name the runtime already exposes.
  console.log('[BOOT] route: GET /api/news/serp/backfill-patch');
  app.get('/api/news/serp/backfill-patch', async (req, res) => {
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