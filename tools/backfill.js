const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE  = process.env.API_BASE  || 'https://canadawill-ingest-ave2f8fjcxeuaehz.canadacentral-01.azurewebsites.net';
const PRD_TOPIC = process.env.PRD_TOPIC || 'separation';
const DAYS      = Number(process.env.DAYS || 365);

const ROSTER = path.resolve(process.cwd(), 'backend/express-ingest/data/ab-roster-transformed.json');
if (!fs.existsSync(ROSTER)) throw new Error(`Roster not found at ${ROSTER}`);

const officials = (() => {
  const raw = JSON.parse(fs.readFileSync(ROSTER, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.officials || []);
  return arr.filter(x => x && x.slug);
})();

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function jitter(){ return 1200 + Math.floor(Math.random()*900); }

async function callBackfill(slug){
  const url = `${API_BASE}/api/news/serp/backfill`;
  const params = { who: slug, topic: PRD_TOPIC, days: DAYS, store: 1 };
  let attempt = 0, wait = 1500;
  for(;;){
    try{
      const { data } = await axios.get(url, { params, timeout: 180000 });
      return data;
    }catch(e){
      const s = e?.response?.status || 0;
      const retriable = s===429 || s===503 || (s>=500 && s<600);
      if (retriable && attempt < 4){ attempt++; await sleep(wait); wait = Math.min(wait*2, 20_000); continue; }
      throw e;
    }
  }
}

(async()=>{
  console.log(`Backfilling ${officials.length} officials from ${ROSTER}… (topic=${PRD_TOPIC}, days=${DAYS})`);
  let i = 0;
  for (const o of officials) {
    await sleep(jitter()); // rate-limit friendly
    try {
      const data = await callBackfill(o.slug);
      console.log(`[${++i}/${officials.length}] ${o.slug} → count=${data?.count ?? 'n/a'}`);
    } catch (e) {
      console.log(`[${++i}/${officials.length}] ${o.slug} → ERROR: ${e.message}`);
    }
  }
  console.log('Backfill complete.');
})();
