const app = require("./ingest-minimal.js");

// --- Monitoring & Progress (drop-in) ---
const fs = require("fs");
const path = require("path");
const { BlobServiceClient } = require("@azure/storage-blob");

const PROGRESS_FILE = path.join(__dirname, "backfill.progress.json");
function readProgressSafe() { try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); } catch { return { running:false, message:"no progress file yet" }; } }
function writeProgressSafe(obj) { try { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(obj)); } catch {} }
function progressLog(msg) { try { console.log(`[backfill] ${msg}`); } catch {} }

const AZURE_CONN = process.env.AZURE_STORAGE_CONNECTION;
const ARTICLES_CONTAINER = process.env.ARTICLES_CONTAINER || "articles";
const ROSTER_PATH = process.env.ROSTER_PATH || "data/ab-roster-transformed.json";
let ROSTER = []; try { ROSTER = JSON.parse(fs.readFileSync(path.join(__dirname, ROSTER_PATH), "utf8")); } catch {}

let _container = null;
function containerClient() {
  if (!_container) {
    if (!AZURE_CONN) throw new Error("AZURE_STORAGE_CONNECTION missing");
    _container = BlobServiceClient.fromConnectionString(AZURE_CONN).getContainerClient(ARTICLES_CONTAINER);
  }
  return _container;
}
async function countPrefix(prefix, limit = Infinity) {
  const c = containerClient(); let n=0;
  for await (const b of c.listBlobsFlat({ prefix })) { n++; if (n>=limit && limit!==Infinity) break; }
  return n;
}
async function listLatest(prefix, max = 5) {
  const c = containerClient(); const items=[];
  for await (const b of c.listBlobsFlat({ prefix })) items.push({ name:b.name, lastModified:b.properties.lastModified });
  items.sort((a,b)=>(b.lastModified?.getTime()||0)-(a.lastModified?.getTime()||0));
  return items.slice(0, max);
}

// Status heartbeat (quick check)
app.get("/api/admin/status", (req,res)=> {
  let heartbeatMs=null; try { const s=fs.statSync(PROGRESS_FILE); heartbeatMs = Date.now()-s.mtimeMs; } catch {}
  const p = readProgressSafe();
  res.json({ ok:true, service:"ingest", running:!!p.running, phase:p.phase||null, total:p.total||null, done:p.done||null, heartbeatMs });
});

// Raw progress (JSON file)
app.get("/api/news/progress", (req,res)=> res.json(readProgressSafe()) );

// Counts per official from Blob Storage
app.get("/api/news/stats", async (req,res)=>{
  try {
    const officials = Array.isArray(ROSTER)? ROSTER : []; const out=[];
    for (const o of officials) {
      const slug = o.slug || o.id || o.name; if (!slug) continue;
      const n = await countPrefix(`raw/serp/${slug}/`, 999999);
      out.push({ slug, fullName: o.fullName || o.name || slug, articles: n });
    }
    out.sort((a,b)=>b.articles-a.articles);
    res.json({ ok:true, count: out.length, items: out });
  } catch(e){ res.status(500).json({ ok:false, error: String(e&&e.message||e) }); }
});

// Latest blobs for a person
// GET /api/news/articles?who=<slug>&limit=5
app.get("/api/news/articles", async (req,res)=>{
  try {
    const slug = String(req.query.who||"").trim(); if (!slug) return res.status(400).json({ ok:false, error:"missing who=<slug>" });
    const limit = Math.max(1, Math.min(100, Number(req.query.limit||5)));
    const items = await listLatest(`raw/serp/${slug}/`, limit);
    res.json({ ok:true, slug, items });
  } catch(e){ res.status(500).json({ ok:false, error: String(e&&e.message||e) }); }
});

// Expose helpers for use below
app.set("backfillProgressWrite", writeProgressSafe);
app.set("backfillProgressRead", readProgressSafe);
app.set("backfillProgressLog", progressLog);
// --- End Monitoring & Progress ---

// Ensure /api/admin/backfill is registered (progress-streaming backfill on Azure)
try {
  require('./src/admin-backfill.runtime')(app);
  console.log('admin-backfill route loaded');
} catch (e) {
  console.error('admin-backfill not loaded:', e && e.message ? e.message : e);
}

const port = process.env.PORT || process.env.WEBSITES_PORT || 8080;
if (require.main === module) {
  app.listen(port, () => console.log(`[ingest shim] listening on ${port}`));
}
module.exports = app;
