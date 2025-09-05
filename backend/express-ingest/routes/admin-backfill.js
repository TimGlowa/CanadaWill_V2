const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONN       = process.env.AZURE_STORAGE_CONNECTION;
const SERP_TOKEN = process.env.SERPHOUSE_API_TOKEN;
const ROSTER_REL = process.env.ROSTER_PATH; // e.g. backend/express-ingest/data/ab-roster-transformed.json
if (!CONN)       throw new Error('AZURE_STORAGE_CONNECTION missing');
if (!SERP_TOKEN) throw new Error('SERPHOUSE_API_TOKEN missing');
if (!ROSTER_REL) throw new Error('ROSTER_PATH missing');

const CONTAINER  = 'news';
const ROSTER     = path.resolve(process.cwd(), ROSTER_REL);

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
  const m = str.match(/^(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/i);
  if (m) {
    const n = +m[1], u = m[2].toLowerCase();
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
async function streamToBuffer(readable){ const a=[]; for await (const c of readable) a.push(Buffer.from(c)); return Buffer.concat(a); }

async function writeDay(container, slug, y, m, d, items){
  const name = `raw/serp/${slug}/${y}/${m}/${d}.json`;
  const body = JSON.stringify({ meta:{ slug, day:`${y}-${m}-${d}`, count: items.length }, articles: items });
  const client = container.getBlockBlobClient(name);
  await client.deleteIfExists();
  await client.upload(body, Buffer.byteLength(body), { blobHTTPHeaders:{ blobContentType:'application/json' } });
}

module.exports = async function adminBackfill(req, res){
  try {
    if (!fs.existsSync(ROSTER)) return res.status(500).send(`Roster not found at ${ROSTER}`);
    const raw = JSON.parse(fs.readFileSync(ROSTER,'utf8'));
    const officials = (Array.isArray(raw) ? raw : raw.officials || []).filter(x => x && x.slug && x.fullName && x.office);

    // stream plain text progress (chunked)
    res.setHeader('Content-Type','text/plain; charset=utf-8');
    res.setHeader('Cache-Control','no-cache');
    res.setHeader('Connection','keep-alive');

    const svc = BlobServiceClient.fromConnectionString(CONN);
    const container = svc.getContainerClient(CONTAINER);
    await container.createIfNotExists();

    res.write(`Backfilling ${officials.length} officials → container "${CONTAINER}" (12 months, no caps)\n`);

    let i=0, total=0;
    for (const o of officials) {
      res.write(`[${++i}/${officials.length}] ${o.slug} … `);

      const q = buildQuery(o.fullName, o.office);
      const url = 'https://api.serphouse.com/serp/live';
      const headers = { Authorization: `Bearer ${SERP_TOKEN}` };
      const minDate = new Date(Date.now() - 365*86_400_000);
      const seen = new Set();
      const buckets = new Map(); // y/m/d -> items

      let page = 1, backoff = 1500, count = 0;
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
            fresh++; count++;
          }

          if (fresh === 0) break;
          page++;
          if (page > 200) break;
          backoff = 1500;
          await sleep(250);
        }catch(e){
          const s = e?.response?.status || 0;
          if (s === 429 || s === 503){ await sleep(backoff); backoff = Math.min(backoff*2, 20_000); continue; }
          res.write(`ERROR ${e.message}\n`); count = -1; break;
        }
      }

      // write per day
      if (count > 0){
        for (const [key, arr] of buckets.entries()){
          const [y,m,d] = key.split('/');
          await writeDay(container, o.slug, y, m, d, arr);
        }
        total += count;
        res.write(`OK count=${count}\n`);
      } else if (count === 0) {
        res.write(`OK count=0\n`);
      }

      await sleep(jitter());
    }

    res.write(`Backfill complete. Total stored: ${total}\n`);
    res.end();
  } catch (err) {
    res.status(500).send(err.message);
  }
};
