const { promises: fs } = require('fs');
const fssync = require('fs');
const path = require('path');

// =================== CONFIG ===================
const SERPHOUSE_URL = 'https://api.serphouse.com/serp/live';
const DOMAIN = 'google.ca';
const LANG = 'en';
const DEVICE = 'desktop';
const LOCATION = 'Alberta,Canada';
const NUM = 100;              // ask for as many as allowed per request
const TIMEBOX = 'qdr:y';      // last year
const BASE_DELAY_MS = 1200;   // polite throttle between calls
const JITTER_MS = 800;
// ==============================================

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function jitter(){ return BASE_DELAY_MS + Math.floor(Math.random()*JITTER_MS); }
function nowIso(){ return new Date().toISOString().replace(/[:]/g,'-'); }

async function loadRoster(){
  const tries = [
    path.resolve(process.cwd(), 'backend/express-ingest/data/ab-roster-transformed.json'),
    path.resolve(process.cwd(), 'express-ingest/data/ab-roster-transformed.json'),
    path.resolve(process.cwd(), 'data/ab-roster-transformed.json'),
  ];
  for (const p of tries){
    if (fssync.existsSync(p)){
      const raw = JSON.parse(await fs.readFile(p, 'utf8'));
      return Array.isArray(raw) ? raw : (raw.officials || []);
    }
  }
  throw new Error('Roster not found at express-ingest/data/ab-roster-transformed.json or data/ab-roster-transformed.json');
}

// Minimal name inference if roster lacks "name"
function nameFromSlug(slug){
  return slug.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------- Azure storage (optional, with fallback) ----------
let storageMode = 'azure';
let container = null;
async function initAzure(){
  try {
    const { BlobServiceClient } = require('@azure/storage-blob');
    const conn = process.env.AZURE_STORAGE_CONNECTION;
    if (!conn) throw new Error('AZURE_STORAGE_CONNECTION missing');
    const svc = BlobServiceClient.fromConnectionString(conn);
    container = svc.getContainerClient('articles');
    await container.createIfNotExists();
  } catch (e){
    storageMode = 'local';
    await fs.mkdir(path.resolve(process.cwd(), 'out/raw/serp'), { recursive: true });
    console.log('[store] Azure unavailable → writing to ./out/raw/serp');
  }
}
async function storeJson(slug, page, payload){
  const blobPath = `raw/serp/${slug}/${nowIso()}-p${page}.json`;
  const body = JSON.stringify(payload);
  if (storageMode === 'azure'){
    const client = container.getBlockBlobClient(blobPath);
    await client.upload(body, Buffer.byteLength(body), { blobHTTPHeaders: { blobContentType: 'application/json' }});
    return `azure:${blobPath}`;
  } else {
    const localPath = path.resolve(process.cwd(), `out/${blobPath}`);
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    await fs.writeFile(localPath, body, 'utf8');
    return `local:${localPath}`;
  }
}

// ---------- SERPHouse client (POST + Bearer, tbm=nws) ----------
async function serphouseNews({ q, page }){
  const token = process.env.SERPHOUSE_API_TOKEN;
  if (!token) throw new Error('SERPHOUSE_API_TOKEN is missing');

  const body = {
    q,
    domain: DOMAIN,
    lang: LANG,
    device: DEVICE,
    tbm: 'nws',
    location: LOCATION,
    num: NUM,
    page,          // pagination (provider-supported)
    tbs: TIMEBOX,  // time box: last year
  };

  const res = await fetch(SERPHOUSE_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const status = res.status;
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const err = (data && typeof data === 'object') ? JSON.stringify(data) : (await res.text().catch(()=>'')) || 'error';
    return { status, news: [], raw: data, error: err };
  }

  const news = data?.results?.news || [];
  return { status, news, raw: data, error: '' };
}

// ---------- Main backfill ----------
(async () => {
  await initAzure();
  const officials = (await loadRoster()).filter(o => o && o.slug);

  const summary = [['slug','pages','total_unique','stored_pages','last_status','last_error']];
  let processed = 0;

  for (const o of officials){
    const slug = o.slug;
    const q = (o.name || nameFromSlug(slug)).toLowerCase(); // keep simple and broad
    const seen = new Set(); // dedupe by url
    let page = 1;
    let stored = 0;
    let total = 0;
    let lastStatus = '';
    let lastError = '';
    let emptyHops = 0;

    console.log(`\n[${++processed}/${officials.length}] ${slug} — q="${q}"`);

    while (true){
      await sleep(jitter());

      const { status, news, raw, error } = await serphouseNews({ q, page });
      lastStatus = String(status);
      lastError = error || '';

      if (status === 429 || status === 503) {
        // brief backoff and retry this same page
        console.log(`  page ${page} → ${status} (rate-limited). Backing off…`);
        await sleep(4000);
        continue;
      }

      if (error) {
        console.log(`  page ${page} → ${status} ERROR: ${error.slice(0,200)}`);
        break; // move on to next official
      }

      const fresh = news.filter(it => {
        const u = (it.url || it.link || '').trim();
        if (!u || seen.has(u)) return false;
        seen.add(u); return true;
      });

      console.log(`  page ${page} → ${status}, got ${news.length}, new ${fresh.length}`);

      // stop if nothing new or provider returned nothing
      if (fresh.length === 0) {
        emptyHops += 1;
        if (emptyHops >= 1) break;
      } else {
        emptyHops = 0;
        total += fresh.length;
        // store page payload (only fresh items to reduce size)
        const storedWhere = await storeJson(slug, page, {
          meta: { slug, q, page, status, count: fresh.length, mode: 'news', timebox: TIMEBOX, num: NUM },
          items: fresh,
        });
        stored += 1;
        console.log(`    stored: ${storedWhere}`);
      }

      page += 1; // keep paginating until empty
    }

    summary.push([slug, String(page-1), String(total), String(stored), lastStatus, lastError ? lastError.replace(/\s+/g,' ').slice(0,200) : '']);
  }

  const csv = summary.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const out = path.resolve(process.cwd(), 'serp-backfill-full-summary.csv');
  await fs.writeFile(out, csv, 'utf8');
  console.log(`\nWrote ${out}`);
})();
