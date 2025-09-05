// tools/backfill.js
// KISS: uses ONLY existing envs (AZURE_STORAGE_CONNECTION, SERPHOUSE_API_TOKEN).
// Hard-coded container "news" and roster path "backend/express-ingest/data/ab-roster-transformed.json".
// Broad PRD query, 12 months, NO CAPS. Writes to news/raw/serp/<slug>/<YYYY>/<MM>/<DD>.json (merged per day).

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONN       = process.env.AZURE_STORAGE_CONNECTION;
const SERP_TOKEN = process.env.SERPHOUSE_API_TOKEN;
if (!CONN)       throw new Error('AZURE_STORAGE_CONNECTION missing');
if (!SERP_TOKEN) throw new Error('SERPHOUSE_API_TOKEN missing');

const CONTAINER  = 'news';
const ROSTER     = path.resolve(process.cwd(), 'backend/express-ingest/data/ab-roster-transformed.json');
if (!fs.existsSync(ROSTER)) throw new Error(`Roster not found at ${ROSTER}`);

const officials = (() => {
  const raw = JSON.parse(fs.readFileSync(ROSTER, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.officials || []);
  return arr.filter(x => x && x.slug && x.fullName && x.office);
})();

const TERMS = [
  "Alberta separation","Alberta independence","Alberta sovereignty",
  "Sovereignty Act","referendum","secede","leave Canada",
  "break from Canada","Alberta Prosperity Project",
  "Forever Canada","Forever Canadian",
  "remain in Canada","stay in Canada",
  "support Canada","oppose separation",
  "oppose independence","pro-Canada stance",
  "keep Alberta in Canada"
];

function buildQuery(fullName, office){
  const termExpr = TERMS.map(t => `"${t}"`).join(' OR ');
  return `"${fullName}" "${office}" AND (${termExpr})`;
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function jitter(){ return 900 + Math.floor(Math.random()*700); }

function parseNewsDate(s){
  if (!s) return null;
  const str = String(s).trim();
  const rel = str.match(/^(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/i);
  if (rel) {
    const n = +rel[1], u = rel[2].toLowerCase();
    const ms =
      u.startsWith('minute') ? n*60_000 :
      u.startsWith('hour')   ? n*3_600_000 :
      u.startsWith('day')    ? n*86_400_000 :
      u.startsWith('week')   ? n*7*86_400_000 :
      u.startsWith('month')  ? n*30*86_400_000 :
      u.startsWith('year')   ? n*365*86_400_000 : 0;
    return new Date(Date.now() - ms);
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

async function streamToBuffer(readable){
  const chunks=[]; for await(const c of readable) chunks.push(Buffer.from(c)); return Buffer.concat(chunks);
}

async function readDay(container, slug, y, m, d){
  const name = `raw/serp/${slug}/${y}/${m}/${d}.json`;
  try {
    const dl = await container.getBlobClient(name).download();
    const buf = await streamToBuffer(dl.readableStreamBody);
    return JSON.parse(buf.toString('utf8'));
  } catch { return { meta:{ slug, day:`${y}-${m}-${d}` }, articles: [] }; }
}

async function writeDay(container, slug, y, m, d, items){
  const name = `raw/serp/${slug}/${y}/${m}/${d}.json`;
  const body = JSON.stringify({ meta:{ slug, day:`${y}-${m}-${d}`, count: items.length }, articles: items });
  const client = container.getBlockBlobClient(name);
  await client.deleteIfExists();
  await client.upload(body, Buffer.byteLength(body), { blobHTTPHeaders: { blobContentType: 'application/json' } });
}

async function backfillOne(container, slug, fullName, office){
  const q = buildQuery(fullName, office);
  const url = 'https://api.serphouse.com/serp/live';
  const headers = { Authorization: `Bearer ${SERP_TOKEN}` };
  const minDate = new Date(Date.now() - 365*86_400_000);

  const seen = new Set();
  const buckets = new Map(); // key: y/m/d -> array

  let page = 1, backoff = 1500, total = 0;

  for(;;){
    try{
      const { data } = await axios.post(url, {
        q, domain:'google.ca', lang:'en', device:'desktop', tbm:'nws', num:100, page
      }, { headers, timeout: 60_000 });

      const news = data?.results?.news || [];
      if (!news.length) break;

      let fresh = 0;
      for (const it of news){
        const dt = parseNewsDate(it.time || it.date || it.published_time);
        if (!dt || dt < minDate) continue;
        const u = (it.url || it.link || '').trim();
        if (!u || seen.has(u)) continue;
        seen.add(u);
        const y = dt.getFullYear();
        const m = String(dt.getMonth()+1).padStart(2,'0');
        const d = String(dt.getDate()).padStart(2,'0');
        const key = `${y}/${m}/${d}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(it);
        fresh++; total++;
      }

      if (fresh === 0) break;
      page++;
      if (page > 200) break;
      backoff = 1500;
      await sleep(250);
    }catch(e){
      const s = e?.response?.status || 0;
      if (s === 429 || s === 503){ await sleep(backoff); backoff = Math.min(backoff*2, 20_000); continue; }
      throw e;
    }
  }

  // merge/write per day
  for (const [key, arr] of buckets.entries()){
    const [y,m,d] = key.split('/');
    const existing = await readDay(container, slug, y, m, d);
    const merged = (existing.articles || []).concat(arr);
    await writeDay(container, slug, y, m, d, merged);
  }

  return total;
}

(async()=>{
  const svc = BlobServiceClient.fromConnectionString(CONN);
  const container = svc.getContainerClient(CONTAINER);
  await container.createIfNotExists();

  console.log(`Backfilling ${officials.length} officials → container "${CONTAINER}" (12 months, no caps)`);
  let i=0, total=0;
  for (const o of officials){
    process.stdout.write(`[${++i}/${officials.length}] ${o.slug} … `);
    try{
      const n = await backfillOne(container, o.slug, o.fullName, o.office);
      total += n; console.log(`OK count=${n}`);
    }catch(e){ console.log(`ERROR ${e.message}`); }
    await sleep(jitter());
  }
  console.log(`Backfill complete. Total stored: ${total}`);
})();