export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

const SEARCH_TIMEOUT_MS = 10000;
const MAX_RESULTS = 15;

const NEEDS_SEARCH_PATTERNS = [
  /\b(latest|current|recent|today|now|this\s+year|this\s+month|this\s+week)\b/i,
  /\b(202[3-9]|203\d)\b/,
  /\b(news|update|trending|happening)\b/i,
  /\b(stock|share\s+price|market\s+cap|revenue|earnings|quarterly)\b/i,
  /\b(announced|launched|released|published|report)\b/i,
  /\b(regulation|policy|government|budget|act|bill|mandate|directive)\b/i,
  /\b(compare|vs|versus|competitor|alternative)\b/i,
  /\b(market\s+size|market\s+growth|CAGR|forecast|projection|outlook)\b/i,
  /\bwho\s+is\b/i,
  /\b(tender|RFQ|bid|contract\s+award)\b/i,
  /\b(green\s+hydrogen|bio[\s-]?CNG|carbon\s+credit|ESG|net[\s-]?zero)\b/i,
  /\b(search|look\s+up|find\s+out|what'?s\s+new|research)\b/i,
];

/**
 * Fast heuristic: does the user's latest message likely need live web data?
 * Runs in < 1ms — no LLM call needed.
 */
export function needsWebSearch(query: string): boolean {
  return NEEDS_SEARCH_PATTERNS.some((p) => p.test(query));
}

/**
 * Fetch search results from DuckDuckGo's HTML endpoint.
 * Hard timeout ensures we never block the response for more than SEARCH_TIMEOUT_MS.
 */
export async function searchWeb(
  query: string,
  maxResults: number = MAX_RESULTS
): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

    const res = await fetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      body: `q=${encodeURIComponent(query)}&kl=wt-wt`,
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return [];

    const html = await res.text();
    return parseDDGResults(html, maxResults);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('Web search timed out after', SEARCH_TIMEOUT_MS, 'ms');
    } else {
      console.warn(
        'Web search failed:',
        err instanceof Error ? err.message : 'unknown'
      );
    }
    return [];
  }
}

function parseDDGResults(html: string, max: number): SearchResult[] {
  const results: SearchResult[] = [];

  const resultRegex =
    /class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/(?:td|div|span)>/gi;

  let match: RegExpExecArray | null;
  while ((match = resultRegex.exec(html)) !== null && results.length < max) {
    let url = match[1] || '';
    const title = stripHtml(match[2] || '');
    const snippet = stripHtml(match[3] || '');

    if (url.includes('uddg=')) {
      const decoded = decodeURIComponent(
        url.split('uddg=')[1]?.split('&')[0] || ''
      );
      if (decoded) url = decoded;
    }

    if (title && snippet && url) {
      results.push({ title: title.trim(), snippet: snippet.trim(), url: url.trim() });
    }
  }

  return results;
}

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Build a compact context block from search results.
 * Designed to be concise to minimise token overhead.
 */
export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) return '';

  const lines = results.map(
    (r, i) => `[${i + 1}] ${r.title}\n    ${r.snippet}\n    Source: ${r.url}`
  );

  return [
    '--- WEB SEARCH RESULTS (live) ---',
    ...lines,
    '--- END WEB SEARCH ---',
    '',
    'Use the above web search results to supplement your knowledge with the latest information. Cite sources by number [1], [2], etc. when using web data. If the search results are not relevant, rely on your own knowledge.',
  ].join('\n');
}
