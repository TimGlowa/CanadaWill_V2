import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  // Preflight
  if (req.method === "OPTIONS") {
    return { status: 204, headers: corsHeaders() };
  }

  let slug: string | undefined;
  if (req.method === "GET") {
    const url = new URL(req.url);
    slug = url.searchParams.get("slug") ?? undefined;
  } else if (req.method === "POST") {
    const body = await req.json().catch(() => ({})) as { slug?: string };
    slug = body?.slug;
  }

  if (!slug) {
    return { status: 400, headers: corsHeaders(), body: JSON.stringify({ ok: false, error: "slug required" }) };
  }

  context.log(`newsIngest received slug=${slug}`);
  return { status: 200, headers: corsHeaders(), body: JSON.stringify({ ok: true, slug }) };
}

app.http("newsIngest", {
  route: "news/ingest",
  methods: ["GET", "POST", "OPTIONS"],
  authLevel: "anonymous",
  handler
}); 