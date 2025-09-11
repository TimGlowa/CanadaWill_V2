const { promises: fs } = require('fs');
const path = require('path');

const API_BASE = 'https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net';

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
function jitter(){ return 900 + Math.floor(Math.random()*700); }

async function loadRoster(){
  const paths = [
    'backend/express-ingest/data/ab-roster-transformed.json',
    'express-ingest/data/ab-roster-transformed.json',
    'data/ab-roster-transformed.json'
  ];
  for (const p of paths){
    try {
      const raw = await fs.readFile(path.resolve(process.cwd(), p), 'utf8');
      const json = JSON.parse(raw);
      return Array.isArray(json) ? json : (json.officials || []);
    } catch {}
  }
  throw new Error('Roster JSON not found in expected paths.');
}

async function callUnlimited(slug){
  const url = `${API_BASE}/api/news/serp/unlimited?who=${encodeURIComponent(slug)}`;
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), 120000);
  try {
    const res = await fetch(url, { method:'GET', headers:{ 'Accept':'application/json' }, signal: ctrl.signal });
    clearTimeout(t);
    let data = null; try { data = await res.json(); } catch {}
    if (!res.ok) return { slug, status: res.status, pages: 0, total: 0, error: JSON.stringify(data||{}) };
    return { slug, status: 200, pages: data?.pages ?? 0, total: data?.total ?? 0, error: '' };
  } catch (e) {
    clearTimeout(t);
    return { slug, status: 0, pages: 0, total: 0, error: e.message || 'fetch_error' };
  }
}

(async ()=>{
  const officials = (await loadRoster()).filter(o => o && o.slug).map(o => o.slug);
  console.log(`Unlimited backfill for ${officials.length} officials…`);
  const rows = [['slug','status','pages','total','error']];
  let i = 0;

  for (const slug of officials){
    await sleep(jitter());
    const r = await callUnlimited(slug);
    i++;
    console.log(`[${i}/${officials.length}] ${slug} → status=${r.status} pages=${r.pages} total=${r.total}${r.error ? ' ERROR':''}`);
    rows.push([slug, String(r.status), String(r.pages), String(r.total), r.error ? r.error.replace(/\s+/g,' ').slice(0,300) : '']);
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  await fs.writeFile(path.resolve(process.cwd(), 'serp-backfill-full-summary.csv'), csv, 'utf8');
  console.log('\nWrote serp-backfill-full-summary.csv');
})();
