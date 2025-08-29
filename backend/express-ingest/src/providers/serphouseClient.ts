import axios from "axios";

const API_URL = "https://api.serphouse.com/serp/live";
const TOKEN = process.env.SERPHOUSE_API_TOKEN || "";

export function isEnabled(): boolean {
  return !!TOKEN && process.env.ENABLE_SERPHOUSE === "true";
}

function toDisplayName(who: string): string {
  if (!who) return "";
  const clean = who.trim().replace(/[-_]+/g, " ");
  return clean
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function tbsForDays(days?: number): string | undefined {
  if (!days) return undefined;
  if (days >= 365) return "qdr:y";   // past year
  if (days >= 30)  return "qdr:m";   // past month
  if (days >= 7)   return "qdr:w";   // past week
  return "qdr:d";                    // past day
}

type FetchArgs = {
  who: string;          // slug or name
  days?: number;        // lookback window
  limit?: number;       // max results
  qOverride?: string;   // optional raw query override (for testing)
};

export async function fetchNews(
  { who, days = 7, limit = 50, qOverride }: FetchArgs
): Promise<any[]> {
  if (!isEnabled()) return [];
  if (!TOKEN) throw new Error("SERPHOUSE_API_TOKEN environment variable is required");

  const displayName = toDisplayName(who);
  const q = qOverride?.trim() || `"${displayName}"`;

  // SERPHouse expects Google params; for News you must set tbm=nws.
  const body: Record<string, any> = {
    engine: "google",
    google_domain: "google.ca",
    gl: "ca",
    hl: "en",
    device: "desktop",
    q,
    num: Math.min(Math.max(Number(limit) || 10, 1), 100),
    tbm: "nws",
  };

  const tbs = tbsForDays(days);
  if (tbs) body.tbs = tbs;

  const resp = await axios.post(API_URL, body, {
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    timeout: 20000,
    // If SERPHouse returns 4xx/5xx, let it throw so callers can log it.
    validateStatus: () => true,
  });

  // Accept several common result shapes (SERP providers vary)
  const data = resp?.data ?? {};
  const items =
    data.news_results ||
    data.items ||
    data.organic_results ||
    [];

  // Normalize a minimal shape; don't drop if publishedAt missing.
  return items
    .map((it: any) => {
      const url   = it.link || it.url;
      const title = it.title || it.heading || it.snippet_title;
      const source =
        it.source ||
        (it.publisher && it.publisher.name) ||
        it.domain ||
        it.displayed_link;
      const publishedAt = it.date || it.published_time || it.publishedAt;
      if (!url || !title) return null;
      return {
        url,
        title,
        source,
        publishedAt,
        provider: "serphouse",
      };
    })
    .filter(Boolean);
}
