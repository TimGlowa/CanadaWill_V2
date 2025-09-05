const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE  = process.env.API_BASE;
const PRD_TOPIC = process.env.PRD_TOPIC;
const DAYS      = Number(process.env.DAYS || 365);

if (!API_BASE)  throw new Error('API_BASE missing');
if (!PRD_TOPIC) throw new Error('PRD_TOPIC missing');

const ROSTER = path.resolve(process.cwd(), 'backend/express-ingest/data/ab-roster-transformed.json');
if (!fs.existsSync(ROSTER)) throw new Error(`Roster not found at ${ROSTER}`);

const officials = (() => {
  const raw = JSON.parse(fs.readFileSync(ROSTER, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.officials || []);
  return arr.filter(x => x && x.slug);
})();

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function jitter(){ return 900 + Math.floor(Math.random()*700); }

async function callBackfill(slug){
  const url = `${API_BASE}/api/news/serp/backfill`;
  const params = { who: slug, topic: PRD_TOPIC, days: DAYS, store: 1 };
  let attempt = 0, wait = 1500;
  for(;;){
    try{
      const t0 = Date.now();
      const { data } = await axios.get(url, { params, timeout: 120_000 });
      return { ok:true, ms: Date.now()-t0, count: data?.count ?? null };
    }catch(e){
      const s = e?.response?.status || 0;
      const retriable = s===429 || s===503 || (s>=500 && s<600);
      if (retriable && attempt < 4){ attempt++; await sleep(wait); wait = Math.min(wait*2, 20_000); continue; }
      return { ok:false, err: (e?.response?.data?.error || e.message) };
    }
  }
}

(async()=>{
  console.log(`Backfilling ${officials.length} officials… (topic=${PRD_TOPIC}, days=${DAYS})`);
  let i=0;
  for (const o of officials){
    process.stdout.write(`[${++i}/${officials.length}] ${o.slug} … `);
    const res = await callBackfill(o.slug);
    if (res.ok) {
      console.log(`OK count=${res.count} (${res.ms}ms)`);
    } else {
      console.log(`ERROR ${res.err}`);
    }
    await sleep(jitter());
  }
  console.log('Backfill complete.');
})();