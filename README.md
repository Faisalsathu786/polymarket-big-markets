# Polymarket Big Markets Monitor

A standalone website that monitors Polymarket for new "big" prediction markets — geopolitical events, crypto milestones, sports finals, elections, and other significant events. Filters out short-term price-guessing markets (Up or Down, 5-minute windows, player props).

Built with React + Vite, deployed on Vercel.

## Features

- Auto-refresh every 30 seconds
- Filters out non-serious markets automatically
- New badge on freshly added markets
- Mobile-friendly responsive design
- Serverless API proxy handles all Polymarket Gamma API calls

## Deployment

Push to GitHub and deploy on Vercel:

```bash
git init
git add .
git commit -m "initial: polymarket big market monitor"
git remote add origin https://github.com/Faisalsathu786/polymarket-big-markets.git
git push -u origin main
```

Then import the repo at https://vercel.com/import — framework auto-detects as Vite.

## Local Development

```bash
npm install
npm run dev     # starts Vite dev server
npm run build   # production build
```

## API

`/api/markets?limit=100` — returns filtered Polymarket markets, newest first.
