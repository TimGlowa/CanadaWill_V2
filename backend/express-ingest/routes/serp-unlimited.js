const axios = require('axios');
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function serpUnlimited(req, res) {
  try {
    const slug = String(req.query.who || '').trim();
    if (!slug) return res.status(400).json({ ok:false, error:'missing who' });

    const token = process.env.SERPHOUSE_API_TOKEN;
    if (!token) return res.status(500).json({ ok:false, error:'SERPHOUSE_API_TOKEN not configured' });

    const conn = process.env.AZURE_STORAGE_CONNECTION;
    if (!conn) return res.status(500).json({ ok:false, error:'AZURE_STORAGE_CONNECTION not configured' });

    const svc = BlobServiceClient.fromConnectionString(conn);
    const container = svc.getContainerClient('articles');
    await container.createIfNotExists();

    const tbs = 'qdr:y'; // last 12 months
    const num = 100;     // max per page
    const domain = 'google.ca';
    const payloadBase = {
      q: slug.replace(/-/g, ' '),
      domain, lang: 'en', device: 'desktop',
      tbm: 'nws', location: 'Alberta,Canada',
      num, tbs
    };

    let page = 1, total = 0, storedPages = 0;
    const seen = new Set();

    // paginate until provider returns nothing new
    for (;;) {
      const body = { ...payloadBase, page };
      const rsp = await axios.post('https://api.serphouse.com/serp/live', body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });

      const news = rsp.data?.results?.news || [];
      const fresh = news.filter(it => {
        const u = (it.url || it.link || '').trim();
        if (!u || seen.has(u)) return false;
        seen.add(u); return true;
      });

      if (fresh.length === 0) break;

      const key = `raw/serp/${slug}/${new Date().toISOString().replace(/[:]/g,'-')}-p${page}.json`;
      const blob = container.getBlockBlobClient(key);
      const buf = Buffer.from(JSON.stringify({ meta:{ slug, page, count: fresh.length, mode: 'news', tbs }, items: fresh }));
      await blob.upload(buf, buf.length, { blobHTTPHeaders: { blobContentType: 'application/json' } });

      storedPages += 1;
      total += fresh.length;
      page += 1;

      await new Promise(r => setTimeout(r, 1200 + Math.floor(Math.random()*800))); // polite throttle
    }

    return res.json({ ok:true, who:slug, pages: page-1, total, storedPages });
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json({ ok:false, error: err.message, details: err.response?.data });
  }
};
