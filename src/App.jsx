import { useState, useEffect, useCallback } from 'react';
import MarketCard from './components/MarketCard.jsx';

const API_URL = '/api/markets';
const REFRESH_MS = 30000;

function getSeenSet() {
  try {
    const raw = localStorage.getItem('pm-seen-slugs');
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSeen(slugs) {
  localStorage.setItem('pm-seen-slugs', JSON.stringify([...slugs]));
}

export default function App() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);

  const fetchMarkets = useCallback(async (isInitial) => {
    try {
      const res = await fetch(API_URL + '?limit=100');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const seen = getSeenSet();
      const now = Date.now();

      const enriched = (data.markets || []).map(m => {
        const isNew = !seen.has(m.slug);
        if (isNew && isInitial) seen.add(m.slug);
        return { ...m, isNew };
      });

      if (isInitial) saveSeen(seen);

      setMarkets(enriched);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets(true);
    const interval = setInterval(() => fetchMarkets(false), REFRESH_MS);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_MS / 1000 : prev - 1));
    }, 1000);
    return () => { clearInterval(interval); clearInterval(countdownInterval); };
  }, [fetchMarkets]);

  useEffect(() => {
    if (markets.length === 0) return;
    const seen = getSeenSet();
    let changed = false;
    for (const m of markets) {
      if (!seen.has(m.slug)) {
        seen.add(m.slug);
        changed = true;
      }
    }
    if (changed) saveSeen(seen);
  }, [markets]);

  const liveMarkets = markets.filter(m => !m.isResolved);
  const resolvedMarkets = markets.filter(m => m.isResolved);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Polymarket Big Markets</h1>
          <p style={styles.subtitle}>Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Polymarket Big Markets</h1>
        <p style={styles.subtitle}>
          Significant geopolitical, crypto, sports, and political events
          {error && <span style={styles.error}> - {error}</span>}
        </p>
        <div style={styles.statusBar}>
          <span>{liveMarkets.length} active / {resolvedMarkets.length} resolved</span>
          <span>Refresh in {countdown}s</span>
          <button onClick={() => { setLoading(true); fetchMarkets(false); }} style={styles.refreshBtn}>
            Refresh Now
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {liveMarkets.map(m => (
          <MarketCard key={m.conditionId || m.slug} market={m} />
        ))}
        {resolvedMarkets.map(m => (
          <MarketCard key={m.conditionId || m.slug} market={m} />
        ))}
      </div>

      {markets.length === 0 && (
        <div style={styles.empty}>
          <h2>No markets found</h2>
          <p>Waiting for new big markets to appear on Polymarket...</p>
        </div>
      )}

      <div style={styles.footer}>
        Data from Polymarket Gamma API. Updates every 30 seconds.
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    margin: '0 0 4px',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#666',
    margin: '0 0 12px',
  },
  error: { color: '#e74c3c' },
  statusBar: {
    fontSize: '0.8rem',
    color: '#888',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  refreshBtn: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '16px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#888',
  },
  footer: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: '0.75rem',
    marginTop: '40px',
    padding: '16px 0',
    borderTop: '1px solid #eee',
  },
};
