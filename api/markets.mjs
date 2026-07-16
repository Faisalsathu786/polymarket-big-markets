const GAMMA_API = 'https://gamma-api.polymarket.com/markets?limit=200&closed=false&order=createdAt&ascending=false';

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
  /both teams slay/i,
  /odd\/even (total )?kills/i,
  /map \d+:? /i,
  /game \d:? /i,
  /round \d+ (total|handicap)/i,
  /first (blood|tower|dragon|baron|kill)/i,
  /will (\w+ )?win (map |game )?\d/i,
  /correct score/i,
  /exact score/i,
  /total kills/i,
  /total rounds/i,
  /race to \d/i,
  /cs2[\s-]/i,
  /league of legends/i,
  /dota 2/i,
  /valorant/i,
  /will (\w+ )?be the (top|first)/i,
  /draftkings/i,
  /spread -?\d+/i,
  /under \d+\.?\d*$/i,
  /over \d+\.?\d*$/i,
  /(\w+ vs \w+) \d+:\d+/i,
  /game handicap/i,
  /1st half/i,
  /2nd half/i,
  /team total/i,
  /btts/i,
  /both teams? to score/i,
  /\d+ shots? on target/i,
  /\d+ assists?/i,
  /\d+ saves?/i,
  /\d+ clearances?/i,
  /\d+ tackles?/i,
  /\d+ passes?/i,
  /\d+ fouls?/i,
  /to be (carded|booked|sent off)/i,
  /to score (a goal|first|anytime|last)/i,
  /to receive a/i,
  /method of victory/i,
  /most goals/i,
  /number of goals/i,
  /anything to happen/i,
  /alternate (total|spread)/i,
  /player (total|props|to |under |over )/i,
  /winner: /i,
  /exact goals/i,
  /double chance/i,
  /total (\w+ )?goals/i,
  /match result/i,
  /win to nil/i,
  /clean sheet/i,
  /draw no bet/i,
  /half time\/full time/i,
  /anytime scorer/i,
  /both halves? to score/i,
  /xG/i,
  /and over \d+\.?\d*/i,
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
  /\bwar\b/i,
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
  /king of the hill/i,
  /spacex/i,
  /trump/i,
  /super bowl/i,
  /fifwc/i,
  /fifa/i,
  /euro \d+/i,
  /olymp(c|ic)/i,
];

const GENERIC_SPORTS_REGEX = [
  / vs\.? /i,
  /\bteam\b.*\bwin\b/i,
  /\/\d+\b/i,
  /o\/u/i,
  /over.*under/i,
  /final (score|result)/i,
  /to advance/i,
  /\d+\.?\d* goals/i,
  /\d+\.?\d* points/i,
  /will they (score|win|lose|draw)/i,
  /half time/i,
  /full time/i,
];

function shouldSkip(text) {
  if (SHORT_TIME_REGEX.test(text)) return true;
  for (const re of SKIP_REGEX) {
    if (re.test(text)) return true;
  }
  return false;
}

function hasBigKeywords(text) {
  for (const re of BIG_KEYWORDS) {
    if (re.test(text)) return true;
  }
  return false;
}

function isGenericSportsProp(text) {
  for (const re of GENERIC_SPORTS_REGEX) {
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

function parseNumeric(v) {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  return isNaN(n) ? 0 : n;
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
    const gammaRes = await fetch(GAMMA_API, {
      headers: { 'User-Agent': 'PolymarketMonitor/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!gammaRes.ok) throw new Error(`Gamma API error: ${gammaRes.status}`);
    const gammaData = await gammaRes.json();

    const seenSlugs = new Set();
    const results = [];

    for (const m of gammaData) {
      const question = (m.question || '').trim();
      const slug = (m.slug || '').trim() || m.conditionId;
      if (!question || !slug) continue;
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      // Always run shouldSkip first — catches price-guess markets even if they have big keywords
      if (shouldSkip(question)) continue;

      // Check both question text and slug for big keywords (slug often carries event context)
            const hasSignificantSlug = !hasBigKeywords(question) && (
        /fif/i.test(slug) ||
        /worldcup/i.test(slug) ||
        /final/i.test(slug) ||
        /championship/i.test(slug) ||
        /semi/i.test(slug.replace(/-/g, '')) ||
        /quarter/i.test(slug.replace(/-/g, ''))
      );
      const hasKeyword = hasBigKeywords(question) || hasBigKeywords(slug) || hasSignificantSlug;

      if (!hasKeyword) {
        // For non-keyword markets, also filter generic sports props
        const isGeneric = (
          /^will (the price of )?(\w+ )?(be above|reach|dip|drop|below|hit|touch)/i.test(question) ||
          isGenericSportsProp(question)
        );
        if (isGeneric) continue;
      }

      const volume = parseNumeric(m.volume);
      const liquidity = parseNumeric(m.liquidity || m.liquidityClob || '0');
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
        category: hasKeyword ? 'big' : 'general',
      });
    }

    results.sort((a, b) => {
      const va = parseNumeric(a.volume);
      const vb = parseNumeric(b.volume);
      if (Math.abs(va - vb) > 1000) return vb - va;
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
