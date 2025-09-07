const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = process.env.PORT || process.env.WEBSITES_PORT || 8080;
const bootT0 = Date.now();
const BOOT_LOG = path.join(__dirname, "BOOT.log");
const log = (m)=>{ const s=`[${new Date().toISOString()}] ${m}\n`; try{fs.appendFileSync(BOOT_LOG,s);}catch{} console.log(s.trim()); };

let bootPhase="init", app=null;

// A) Instrument ingest loading with multiple candidate paths
log(`[BOOT] require start, process.cwd(): ${process.cwd()}, __dirname: ${__dirname}`);

const candidatePaths = [
  "./ingest-minimal.js",
  "./express-ingest/dist/ingest",
  "./express-ingest/ingest", 
  "./express-ingest/app"
];

let resolvedPath = null;
for (const candidatePath of candidatePaths) {
  try {
    log(`[BOOT] trying candidate path: ${candidatePath}`);
    app = require(candidatePath);
    resolvedPath = candidatePath;
    bootPhase = "ingest-loaded";
    log(`[BOOT] ingest module loaded from ${resolvedPath}`);
    break;
  } catch (e) {
    log(`[BOOT] candidate path ${candidatePath} failed: ${e.message}`);
  }
}

if (!resolvedPath) {
  bootPhase = "ingest-load-failed";
  log(`[BOOT] all candidate paths failed, no ingest module loaded`);
}

// Mount SERPHouse routes (env, selftest, backfill, refresh)
if (app) {
  try {
    require('./express-ingest/serp-tools.runtime')(app);
    log('[BOOT] SERPHouse routes mounted from express-ingest/serp-tools.runtime.js');
  } catch (e) {
    log(`[BOOT] Failed to mount SERPHouse routes: ${e && e.message ? e.message : e}`);
  }
}

const server = http.createServer((req,res)=>{
  // Let Express app handle all routes if it's loaded
  if(app && app._router) {
    log(`Delegating to Express app: ${req.method} ${req.url}`);
    return app(req,res);
  }
  if(app && typeof app==="function") {
    log(`Delegating to function app: ${req.method} ${req.url}`);
    return app(req,res);
  }
  
  // Fallback routes only if Express app isn't working
  if(req.url==="/api/health" && req.method==="GET"){
    const body=JSON.stringify({ok:true,bootPhase,uptimeMs:Date.now()-bootT0,ts:new Date().toISOString()});
    res.writeHead(200,{"content-type":"application/json"}); return res.end(body);
  }
  if(req.url==="/api/buildinfo" && req.method==="GET"){
    try{ const txt=fs.readFileSync(path.join(__dirname,"buildinfo.json"),"utf8"); res.writeHead(200,{"content-type":"application/json"}); return res.end(txt);}
    catch{ res.writeHead(404,{"content-type":"application/json"}); return res.end(JSON.stringify({error:"no buildinfo.json"})); }
  }
  if(req.url==="/api/whoami" && req.method==="GET"){
    const body=JSON.stringify({file:__filename,pid:process.pid});
    res.writeHead(200,{"content-type":"application/json"}); return res.end(body);
  }
  
  log(`No app loaded, returning 404 for: ${req.method} ${req.url}`);
  res.writeHead(404,{"content-type":"application/json"});
  res.end(JSON.stringify({error:"Not found (fallback)",path:req.url,bootPhase}));
});
server.listen(PORT,()=>{
  log(`listening on ${PORT}`);
  
  // A) Route dump after app.listen
  if (app && app._router) {
    log(`[BOOT] route dump for Express app:`);
    app._router.stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        methods.forEach(method => {
          log(`[BOOT] route: ${method.toUpperCase()} ${layer.route.path}`);
        });
      }
    });
  } else {
    log(`[BOOT] no Express router found for route dump`);
  }
});
