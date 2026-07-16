import { useState } from 'react';

function formatVolume(v) {
  if (!v || v === '0') return '$0';
  const n = parseFloat(String(v).replace(/[$,]/g, ''));
  if (isNaN(n)) return `$${v}`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getCategoryColor(cat, q) {
  const t = (q || '').toLowerCase();
  if (cat === 'big') return '#2ecc71';
  if (t.includes('polit') || t.includes('election') || t.includes('president') || t.includes('iran') || t.includes('israel') || t.includes('war') || t.includes('strait')) return '#e74c3c';
  if (t.includes('bitcoin') || t.includes('ethereum') || t.includes('btc') || t.includes('eth') || t.includes('crypto') || t.includes('credible')) return '#f39c12';
  if (t.includes('world cup') || t.includes('championship') || t.includes('final') || t.includes('golden boot')) return '#2ecc71';
  return '#3498db';
}

export default function MarketCard({ market, isNewHighlight }) {
  const [expanded, setExpanded] = useState(false);
  const m = market;
  const outcomes = m.outcomes || [];
  const hasVolume = m.volume && m.volume !== '0';
  const hasLiq = m.liquidity && m.liquidity !== '0';

  if (!m.slug && !m.question) return null;

  return (
    <div style={{
      ...styles.card,
      borderLeft: `4px solid ${getCategoryColor(m.category, m.question)}`,
      ...(isNewHighlight ? {
        border: '2px solid #27ae60',
        boxShadow: '0 2px 12px rgba(39,174,96,0.2)',
      } : {}),
    }}>
      {isNewHighlight && <div style={styles.liveBadge}>LIVE</div>}
      {m.isNew && !isNewHighlight && <div style={styles.newBadge}>NEW</div>}

      <div style={{
        ...styles.question,
        ...(isNewHighlight ? { color: '#27ae60' } : {}),
      }}>
        {m.question}
        {isNewHighlight && <span style={styles.pulse}> ●</span>}
      </div>

      <div style={styles.meta}>
        {hasVolume && <span style={styles.metaItem}>Vol: {formatVolume(m.volume)}</span>}
        {hasLiq && <span style={styles.metaItem}>Liq: {formatVolume(m.liquidity)}</span>}
        {m.createdAt && <span style={{
          ...styles.metaItem,
          ...(isNewHighlight ? { color: '#27ae60', fontWeight: '600' } : {}),
        }}>{timeAgo(m.createdAt)}</span>}
        {m.endDate && <span style={styles.metaItem}>Ends {formatDate(m.endDate)}</span>}
      </div>

      {outcomes.length > 0 && (
        <div style={styles.outcomes}>
          {outcomes.slice(0, expanded ? outcomes.length : 4).map((o, i) => (
            <span key={i} style={styles.outcome}>{o}</span>
          ))}
          {outcomes.length > 4 && !expanded && (
            <button onClick={() => setExpanded(true)} style={styles.showMoreBtn}>
              +{outcomes.length - 4} more
            </button>
          )}
          {expanded && outcomes.length > 4 && (
            <button onClick={() => setExpanded(false)} style={styles.showMoreBtn}>
              Show less
            </button>
          )}
        </div>
      )}

      <div style={styles.actions}>
        <a href={m.url || `https://polymarket.com/event/${m.slug}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
          View on Polymarket
        </a>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    position: 'relative',
    border: '1px solid #eee',
    transition: 'all 0.2s ease',
  },
  newBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: '#2ecc71',
    color: '#fff',
    fontSize: '0.6rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  liveBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: '#e74c3c',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '3px',
    animation: 'pulseGlow 1.5s ease-in-out infinite',
  },
  question: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '8px',
    lineHeight: '1.3',
    paddingRight: '50px',
  },
  pulse: {
    color: '#27ae60',
    animation: 'blink 1s step-end infinite',
    fontSize: '1rem',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '8px',
    fontSize: '0.72rem',
    color: '#888',
  },
  metaItem: {},
  outcomes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '10px',
  },
  outcome: {
    background: '#f0f2f5',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.72rem',
    color: '#555',
  },
  showMoreBtn: {
    background: 'none',
    border: 'none',
    color: '#3498db',
    cursor: 'pointer',
    fontSize: '0.72rem',
    padding: '3px 8px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  link: {
    fontSize: '0.78rem',
    color: '#3498db',
    textDecoration: 'none',
  },
};
