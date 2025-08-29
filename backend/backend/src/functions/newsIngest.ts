import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

app.http('newsIngest', {
  methods: ['GET','POST','OPTIONS'],
  route: 'news/ingest',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const cors = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return { status: 204, headers: cors };
    const slug = req.method === 'GET'
      ? (new URL(req.url)).searchParams.get('slug') ?? ''
      : ((await req.json().catch(() => ({}))) as { slug?: string })?.slug ?? '';
    if (!slug) return { status: 400, headers: cors, body: JSON.stringify({ ok:false, error:'slug required' }) };
    return { status: 200, headers: cors, body: JSON.stringify({ ok:true, slug }) };
  }
}); 