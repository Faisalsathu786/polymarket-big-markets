const GAMMA_API = 'https://gamma-api.polymarket.com/markets?limit=200&closed=false&order=createdAt&ascending=false';
const GAMMA_EVENTS_API = 'https://gamma-api.polymarket.com/events?limit=100&closed=false&order_by=creationDate&ascending=false';

const SKIP_REGEX = [
  /up or down/i,
  /up\/down/i,
  /price range/i,
  /# tweets/i,
  /tweet count/i,
  /player props/i,
  /points o\/u/i,
  /rebounds o\/u/i,
  /assists o\/u/i,
  /map \d+ (total )?rounds/i,
  /rounds handicap/i,
  /will .+ score/i,
  /\.\.\.\s*\?$/,
  /spread:/i,
  /o\/u \d\.\d/i,
  /total \d\.\d/i,
  /team to (win|score|advance)/i,
  /extra time/i,
  /penalty shootout/i,
  /will the match go to/i,
];

const SHORT_TIME_REGEX = /\d{1,2}:\d{2}\s*[AP]M\s*-\s*\d{1,2}:\d{2}\s*[AP]M/i;

const BIG_KEYWORDS = [
  /world cup/i,
  /election/i,
  /fomc/i,
  /fed decision/i,
  /presiden(t|tial)/i,
  /bitcoin/i,
  /ethereum/i,
  /btc/i,
  /eth/i,
  /crypto/i,
  /ipo/i,
  /fed rate/i,
  /war /i,
  /invasion/i,
  /captur/i,
  /cease/i,
  /nato/i,
  /peace/i,
  /championship/i,
  /golden boot/i,
  /strait of hormuz/i,
  /israel/i,
  /iran/i,
  /credible/i,
];

function shouldSkip(text) {
  const t = text;
  if (SHORT_TIME_REGEX.test(t)) return true;
  for (const re of SKIP_REGEX) {
    if (re.test(t)) return true;
  }
  return false;
}

function isBig(text) {
  for (const re of BIG_KEYWORDS) {
    if (re.test(text)) return true;
  }
  return false;
}

function extractOutcomes(m) {
  const out = m.outcomes;
  if (Array.isArray(out)) {
    return out.map(o => {
      if (typeof o === 'object' && o !== null) return o.name || String(o);
      return String(o);
    }).slice(0, 10);
  }
  if (typeof out === 'string') {
    try {
      const parsed = JSON.parse(out);
      if (Array.isArray(parsed)) return parsed.slice(0, 10);
    } catch {}
  }
  return [];
}

function formatVolume(v) {
  if (!v) return '0';
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? '0' : String(n);
}

export default async function handler(req, res) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  try {
    // Fetch gamma markets (newest first)
    const gammaRes = await fetch(GAMMA_API, {
      headers: { 'User-Agent': 'PolymarketMonitor/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!gammaRes.ok) throw new Error(`Gamma API error: ${gammaRes.status}`);
    const gammaData = await gammaRes.json();

    const now = Date.now();
    const results = [];

    for (const m of gammaData) {
      const question = (m.question || '').trim();
      const slug = (m.slug || '').trim() || m.conditionId;
      if (!question || !slug) continue;
      if (shouldSkip(question)) continue;

      const createdAt = m.createdAt || '';
      const endDate = m.endDate || '';

      results.push({
        question,
        slug,
        conditionId: m.conditionId || '',
        outcomes: extractOutcomes(m),
        volume: formatVolume(m.volume),
        liquidity: formatVolume(m.liquidity || m.liquidityClob || '0'),
        createdAt,
        endDate,
        url: `https://polymarket.com/event/${slug}`,
        isResolved: !!m.closed || !!m.resolved,
        source: 'gamma',
        category: 'general',
      });
    }

    // Sort by creation date descending (newest first)
    results.sort((a, b) => {
      if (a.createdAt && b.createdAt) return new Date(b.createdAt) - new Date(a.createdAt);
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      return 0;
    });

    const limit = parseInt(req.query.limit || '100', 10);

    res.writeHead(200, headers);
    res.end(JSON.stringify({
      markets: results.slice(0, limit),
      total: results.length,
      fetchedAt: new Date().toISOString(),
    }));
  } catch (err) {
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: err.message }));
  }
}
