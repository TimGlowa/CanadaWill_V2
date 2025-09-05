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

function buildQueryForOfficial(who: string): string {
  const displayName = toDisplayName(who);
  return `"${displayName}"`;
}

function parseNewsDate(s: any): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(/^(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)\s+ago$/i);
  if (m) {
    const n = +m[1], u = m[2].toLowerCase();
    const ms =
      u.startsWith('minute') ? n*60_000 :
      u.startsWith('hour')   ? n*3_600_000 :
      u.startsWith('day')    ? n*86_400_000 :
      u.startsWith('week')   ? n*7*86_400_000 :
      u.startsWith('month')  ? n*30*86_400_000 :
      u.startsWith('year')   ? n*365*86_400_000 : 0;
    return new Date(Date.now() - ms);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Unlimited pager (no caps). Enforce 12-month window client-side; de-dupe by URL.
export async function fetchNews({ who, days = 365, qOverride }: FetchArgs) {
  const q = qOverride || buildQueryForOfficial(who); // existing helper in this file
  const headers = { Authorization: `Bearer ${process.env.SERPHOUSE_API_TOKEN}` };
  const base = { q, domain: 'google.ca', lang: 'en', device: 'desktop', tbm: 'nws' };
  const minDate = new Date(Date.now() - 365 * 86_400_000);
  const seen = new Set<string>();
  const out: any[] = [];
  let page = 1;
  let backoff = 1500;
  for (;;) {
    try {
      const payload = { ...base, num: 100, page };
      const { data } = await axios.post(API_URL, payload, { headers, timeout: 60_000 });
      const news = data?.results?.news || [];
      if (!news.length) break;
      let fresh = 0;
      for (const it of news) {
        const dt = parseNewsDate((it as any).time || (it as any).date || (it as any).published_time);
        if (!dt || dt < minDate) continue;
        const u = ((it as any).url || (it as any).link || '').trim();
        if (!u || seen.has(u)) continue;
        seen.add(u);
        out.push(it);
        fresh++;
      }
      if (fresh === 0) break;
      page++;
      if (page > 200) break; // guardrail
      backoff = 1500;
    } catch (e: any) {
      const s = e?.response?.status || 0;
      if (s === 429 || s === 503) {
        await new Promise(r => setTimeout(r, backoff));
        backoff = Math.min(backoff * 2, 20_000);
        continue;
      }
      throw e;
    }
  }
  return { results: { news: out } };
}
