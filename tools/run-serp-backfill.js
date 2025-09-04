const { promises: fs } = require('fs');
const path = require('path');

// 🔧 CONFIG
const API_BASE = 'https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net';
const DAYS = 365;
// No limit - collect all available articles
const STORE = 1;

// Helpers
function qs(params){ return Object.entries(params).map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(base=1500, spread=900){ return base + Math.floor(Math.random()*spread); }

async function loadRoster(){
  const tries = [
    path.resolve(process.cwd(), 'backend/express-ingest/data/ab-roster-transformed.json'),
    path.resolve(process.cwd(), 'express-ingest/data/ab-roster-transformed.json'),
    path.resolve(process.cwd(), 'data/ab-roster-transformed.json'),
  ];
  for (const p of tries){
    try {
      const raw = await fs.readFile(p, 'utf8');
      const json = JSON.parse(raw);
      return Array.isArray(json) ? json : (json.officials || []);
    } catch {}
  }
  throw new Error('Roster JSON not found in expected paths.');
}

async function callBackfill(slug){
  const url = `${API_BASE}/api/news/serp/backfill?${qs({ who: slug, days: DAYS, store: STORE })}`;
  let attempt = 0, delay = 1500;
  while (true){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 30000);
    try {
      const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: ctrl.signal });
      clearTimeout(t);
      const status = res.status;
      let data = null; try { data = await res.json(); } catch {}
      if (!res.ok){
        if ((status === 429 || status === 503 || (status >= 500 && status < 600)) && attempt < 3){
          attempt++; await sleep(delay); delay = Math.min(delay * 2, 20000); continue;
        }
        return { slug, vendor_status: status, count: 0, error: JSON.stringify(data || {}) };
      }
      return { slug, vendor_status: data?.vendor_status ?? status, count: data?.count ?? 0, error: '' };
    } catch (e){
      clearTimeout(t);
      if (attempt < 2){ attempt++; await sleep(delay); delay = Math.min(delay * 2, 20000); continue; }
      return { slug, vendor_status: null, count: 0, error: e.message || 'fetch_error' };
    }
  }
}

(async ()=>{
  const officials = (await loadRoster()).filter(o => o && o.slug).map(o => o.slug);
  console.log(`Backfilling ${officials.length} officials…`);
  const rows = [['slug','vendor_status','count','error']];
  let i = 0;

  for (const slug of officials){
    await sleep(jitter());
    const r = await callBackfill(slug);
    i++;
    console.log(`[${i}/${officials.length}] ${slug} -> status=${r.vendor_status} count=${r.count}${r.error ? ' ERROR':''}`);
    rows.push([slug, String(r.vendor_status ?? ''), String(r.count), r.error ? r.error.replace(/\s+/g,' ').slice(0,500) : '']);
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const out = path.resolve(process.cwd(), 'serp-backfill-results.csv');
  await fs.writeFile(out, csv, 'utf8');
  console.log(`\nWrote ${out}`);
})();
