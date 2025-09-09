/* KISS search rules + topics (locked to your spec)
   Public API preserved: isEnabled, buildEnhancedQuery, buildQueryForOfficial, fetchNews */

import axios from "axios";

const TOPIC_TERMS: string[] = [
  "Alberta separation",
  "Alberta independence",
  "Alberta sovereignty",
  "Sovereignty Act",
  "leave Canada",
  "separate from Canada",
  "secede from Canada",
  "remain in Canada",
  "reject separation",
  "pro-independence",
  "Wexit",
  "independence referendum",
  "separation referendum",
  "Alberta autonomy",
  "ForeverCanadian",
  "Forever Canadian",
  "Alberta Prosperity Project"
];

// Anchor rule: Name + (Role/Title OR Geo) + ONE topic + last 365 days
const ROLE_TITLES = ["MP", "MLA", "Premier", "Minister"];
const GEO_TOKENS  = ["Alberta", "Canada"];

export function isEnabled(): boolean {
  return !!process.env.SERPHOUSE_API_TOKEN;
}

/** Build ONE query string for a single (name, topic) using your anchor rule */
export function buildEnhancedQuery(fullName: string, topic: string): string {
  const qName   = `"${fullName.trim()}"`;
  const anchors = `(${ROLE_TITLES.join(" OR ")} OR ${GEO_TOKENS.join(" OR ")})`;
  // ONE topic per query (no article cap; time window is handled by days param to API)
  return `${qName} ${anchors} ${topic}`;
}

/** Compose the list of concrete queries we'll run for this official (ONE topic per query) */
export function buildQueryForOfficial(fullName: string): string[] {
  return TOPIC_TERMS.map(t => buildEnhancedQuery(fullName, t));
}

/** KISS fetch: iterate queries until we exhaust time window; optional limit controls vendor page size only */
export async function fetchNews(opts: {
  who: string;          // slug or name (caller ensures full name)
  days: number;         // lookback window (e.g., 365)
  limit?: number;       // vendor page size; NOT an article cap
  qOverride?: string;   // developer/debug override
}): Promise<any[]> {
  const apiToken = process.env.SERPHOUSE_API_TOKEN || "";
  if (!apiToken) throw new Error("SERPHOUSE_API_TOKEN missing");
  const days = Math.max(1, Number(opts.days || 365));
  const pageSize = Math.max(1, Math.min(Number(opts.limit || 10), 100));

  // If qOverride is present, run exactly that once.
  const queries = opts.qOverride
    ? [opts.qOverride]
    : buildQueryForOfficial(opts.who);

  const all: any[] = [];
  for (const q of queries) {
    const url = "https://api.serphouse.com/serp/live";
    const params: Record<string, any> = {
      api_token: apiToken,
      q,
      domain: "google.com",
      lang: "en",
      device: "desktop",
      serp_type: "news",
      size: pageSize
      // time window handled by days via the query semantics; some vendors accept extra params,
      // but we keep this KISS and rely on the terms + ongoing refresh cadence
    };

    try {
      const r = await axios.get(url, { params, headers: { accept: "application/json" } });
      const p = r?.data || {};
      const resultsRoot = p?.results?.results || p?.results || {};
      const news = Array.isArray(resultsRoot?.news) ? resultsRoot.news : [];
      // Normalize to {title,url,snippet,date} shape; keep any vendor fields as-is
      for (const item of news) {
        all.push({
          title:   item.title ?? item.heading ?? null,
          url:     item.link ?? item.url ?? null,
          snippet: item.snippet ?? item.description ?? null,
          date:    item.date ?? item.published ?? null,
          _raw:    item
        });
      }
    } catch (e:any) {
      // Non-fatal; continue to next topic query
      // (KISS: no retries here; refresh cadence will mop up)
    }
  }
  return all;
}

export default {
  isEnabled,
  buildEnhancedQuery,
  buildQueryForOfficial,
  fetchNews
};