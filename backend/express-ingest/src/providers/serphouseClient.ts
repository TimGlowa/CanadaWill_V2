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

export function buildEnhancedQuery(person: any): string {
  // Define separation keywords (negatives)
  const separationKeywords = [
    "Alberta separation",
    "Alberta independence", 
    "Alberta sovereignty",
    "Sovereignty Act",
    "referendum",
    "secede",
    "secession",
    "leave Canada",
    "break from Canada",
    "Alberta Prosperity Project",
    "Forever Canada",
    "Forever Canadian"
  ];

  // Define unity keywords (positives)
  const unityKeywords = [
    "remain in Canada",
    "stay in Canada", 
    "support Canada",
    "oppose separation",
    "oppose independence",
    "pro-Canada stance",
    "keep Alberta in Canada"
  ];

  // Combine all keywords
  const allKeywords = [...separationKeywords, ...unityKeywords];

  // Determine title variants based on office
  let titleVariants = [];
  if (person.office === "Member of Legislative Assembly") {
    titleVariants = ["MLA", "Member of Legislative Assembly"];
  } else if (person.office === "Member of Parliament") {
    titleVariants = ["MP", "Member of Parliament"];
  } else {
    // Fallback for other office types
    titleVariants = [person.office];
  }

  // Build the query following the exact specification:
  // "<FullName>" AND ("<Title Variants>") AND (<keywords>)
  const fullName = `"${person.fullName}"`;
  const titleClause = `(${titleVariants.map(v => `"${v}"`).join(' OR ')})`;
  const keywordClause = `(${allKeywords.map(k => `"${k}"`).join(' OR ')})`;

  const query = `${fullName} ${titleClause} AND ${keywordClause}`;

  // Log the exact query for debugging/reproducibility
  console.log(`[QUERY BUILDER] Generated query for ${person.slug}: ${query}`);

  return query;
}

export async function fetchNews(
  { who, days = 7, limit = 1000, qOverride }: FetchArgs
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
    num: Math.max(Number(limit) || 10, 1),
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
