import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [alertCount, setAlertCount] = useState(0);
  const [flashAlert, setFlashAlert] = useState(false);
  const prevCountRef = useRef(0);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(API_URL + '?limit=100');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const seen = getSeenSet();
      const incoming = data.markets || [];

      const newSlugs = [];
      const enriched = incoming.map(m => {
        const isNew = !seen.has(m.slug);
        if (isNew) {
          seen.add(m.slug);
          newSlugs.push(m.slug);
        }
        return { ...m, isNew };
      });

      if (newSlugs.length > 0) {
        saveSeen(seen);
        setAlertCount(c => c + newSlugs.length);
        setFlashAlert(true);
        setTimeout(() => setFlashAlert(false), 5000);
      }

      if (markets.length === 0 || newSlugs.length > 0) {
        setMarkets(enriched);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [markets.length]);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, REFRESH_MS);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_MS / 1000 : prev - 1));
    }, 1000);
    return () => { clearInterval(interval); clearInterval(countdownInterval); };
  }, [fetchMarkets]);

  const newMarkets = markets.filter(m => m.isNew);
  const liveMarkets = markets.filter(m => !m.isNew && !m.isResolved);
  const resolvedMarkets = markets.filter(m => m.isNew === false && m.isResolved);

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
          Significant political, crypto, sports, and geopolitical events
          {error && <span style={styles.error}> - {error}</span>}
        </p>
        <div style={styles.statusBar}>
          <span>{markets.length} markets tracked</span>
          <span>Refresh in {countdown}s</span>
          <button onClick={() => { setMarkets([]); setLoading(true); }} style={styles.refreshBtn}>
            Refresh Now
          </button>
        </div>
      </div>

      {flashAlert && newMarkets.length > 0 && (
        <div style={styles.alertBanner}>
          {newMarkets.length} new market{newMarkets.length > 1 ? 's' : ''} detected!
        </div>
      )}

      {newMarkets.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Just Added</h2>
          <div style={styles.grid}>
            {newMarkets.map(m => (
              <MarketCard key={m.conditionId || m.slug} market={m} isNewHighlight={true} />
            ))}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Active Markets
          {alertCount > 0 && <span style={styles.alertCount}>({alertCount} new since load)</span>}
        </h2>
        <div style={styles.grid}>
          {liveMarkets.map(m => (
            <MarketCard key={m.conditionId || m.slug} market={m} />
          ))}
        </div>
      </div>

      {resolvedMarkets.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Resolved</h2>
          <div style={styles.grid}>
            {resolvedMarkets.map(m => (
              <MarketCard key={m.conditionId || m.slug} market={m} />
            ))}
          </div>
        </div>
      )}

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
    background: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '20px',
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
  alertBanner: {
    background: '#27ae60',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.95rem',
    marginBottom: '16px',
    animation: 'fadeIn 0.5s ease-in',
  },
  section: {
    marginBottom: '28px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1a1a2e',
    margin: '0 0 12px',
  },
  alertCount: {
    fontSize: '0.75rem',
    color: '#27ae60',
    fontWeight: '400',
    marginLeft: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '12px',
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
