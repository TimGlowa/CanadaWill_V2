import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method !== "GET") {
    return { status: 405, body: "Method not allowed" };
  }

  const timestamp = new Date().toISOString();
  context.log(`Health check requested at ${timestamp}`);

  return {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ok: true,
      service: "functions",
      time: timestamp
    })
  };
}

app.http("healthCheck", {
  route: "health",
  methods: ["GET"],
  authLevel: "anonymous",
  handler
}); 