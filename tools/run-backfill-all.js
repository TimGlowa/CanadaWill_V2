const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

// Config via env or defaults
const API_BASE = process.env.API_BASE || 'https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net';
const PRD_TOPIC = process.env.PRD_TOPIC || 'separation';
const DAYS = Number(process.env.DAYS || 365);

// Delay helpers
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function jitter(base=1200, spread=900) { return base + Math.floor(Math.random()*spread); }

// Attempt to load roster from local files; fallback to Blob "news/data/officials.json"
async function loadRoster() {
  const candidates = [
    'Docs/officials.json',
    'backend/express-ingest/data/ab-roster-transformed.json',
    'express-ingest/data/ab-roster-transformed.json',
    'data/ab-roster-transformed.json'
  ].map(p => path.resolve(process.cwd(), p));

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
        const arr = Array.isArray(raw) ? raw : (raw.officials || []);
        if (arr.length) return arr.filter(x => x && x.slug);
      }
    } catch {}
  }

  // Blob fallback
  const CONN = process.env.AZURE_STORAGE_CONNECTION;
  if (!CONN) throw new Error('Roster not found locally and AZURE_STORAGE_CONNECTION missing.');
  const svc = new BlobServiceClient.fromConnectionString(CONN);
  const container = svc.getContainerClient('news');
  const blob = container.getBlobClient('data/officials.json');
  try {
    const dl = await blob.download();
    const buf = await streamToBuffer(dl.readableStreamBody);
    const raw = JSON.parse(buf.toString('utf8'));
    const arr = Array.isArray(raw) ? raw : (raw.officials || []);
    if (arr.length) return arr.filter(x => x && x.slug);
  } catch {}
  throw new Error('Roster file not found (Docs/officials.json or ab-roster-transformed.json or news/data/officials.json).');
}

async function streamToBuffer(readable) {
  const chunks = [];
  for await (const c of readable) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks);
}

async function callBackfill(slug) {
  const url = `${API_BASE}/api/news/serp/backfill`;
  const params = { who: slug, topic: PRD_TOPIC, days: DAYS, store: 1 };

  let attempt = 0;
  let delay = 2000;
  while (true) {
    try {
      const { data } = await axios.get(url, { params, timeout: 180000 });
      return { ok: true, data };
    } catch (e) {
      const status = e?.response?.status || 0;
      const retriable = status === 429 || status === 503 || (status >= 500 && status < 600);
      if (retriable && attempt < 4) {
        attempt++;
        await sleep(delay);
        delay = Math.min(delay * 2, 20000);
        continue;
      }
      const msg = e?.response?.data?.error || e.message;
      return { ok: false, error: msg, status };
    }
  }
}

(async () => {
  const roster = await loadRoster();
  console.log(`Backfilling ${roster.length} officials… (topic=${PRD_TOPIC}, days=${DAYS})`);
  let i = 0;
  for (const r of roster) {
    await sleep(jitter()); // polite delay between officials
    const res = await callBackfill(r.slug);
    i++;
    if (res.ok) {
      console.log(`[${i}/${roster.length}] ${r.slug} -> count=${res.data?.count ?? 'n/a'}`);
    } else {
      console.log(`[${i}/${roster.length}] ${r.slug} -> ERROR: ${res.status || ''} ${res.error}`);
    }
  }
  console.log('Backfill complete.');
})();
