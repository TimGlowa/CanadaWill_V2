const crypto = require('crypto');

async function serphouseNews(query, days, limit){
  const token = process.env.SERPHOUSE_API_TOKEN || '';
  if(!token) return [];
  const since = new Date(Date.now()-days*86400*1000).toISOString().slice(0,10);
  const body = { q: query, engine: "google_news", tbs: `cdr:1,cd_min:${since}`, num: Math.min(Number(limit||10), 50) };
  const resp = await fetch("https://api.serphouse.com/serp/live/search", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if(!resp.ok) return [];
  const data = await resp.json();
  const items = (data?.data?.news_results || data?.data?.organic_results || []);
  return items.map(h=>{
    const url = String(h.link||'').trim();
    const id = crypto.createHash('sha1').update(url||h.title||Math.random().toString()).digest('hex');
    return {
      id,
      url,
      title: String(h.title||'(untitled)'),
      publishedAt: h.date ? new Date(h.date).toISOString() : null,
      snippet: h.snippet || null,
      sourceName: h.source || null
    };
  });
}

module.exports = { serphouseNews };
