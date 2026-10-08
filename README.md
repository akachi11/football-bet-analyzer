# BetIQ — AI-Powered Football Bet Analyzer

A real-time football match analyzer that aggregates data from multiple free APIs and enriches it with AI-generated insights to help you make smarter betting decisions. **100% free to run** — no paid APIs or subscriptions required.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Today's Matches** — Auto-fetches all scheduled matches for the day with live scores
- **Head-to-Head** — Historical meeting records with computed win/draw stats
- **League Standings** — Current table position, points, form, and goal difference
- **Top Scorers & Assisters** — Per-competition and cross-competition aggregation
- **Last 5 Match Stats** — Goals, clean sheets, cards, fouls, scoring/conceding patterns by half
- **AI-Predicted Lineups** — Gemini-powered formation, Starting XI, substitutes, and coach predictions
- **AI-Estimated Injuries & Suspensions** — Current squad availability from AI knowledge
- **Player Ratings & Best Form Player** — AI-generated performance ratings for key players
- **AI Match Analysis** — Full betting predictions with confidence levels for multiple markets (Match Result, BTTS, Over/Under, Cards, First Goalscorer, etc.)
- **Smart Caching & Rate Limiting** — In-memory cache with TTL, request deduplication, and rate limiting to stay within free tier limits

## Data Sources

| Source | What it provides | Limits |
|--------|-----------------|--------|
| [Football-Data.org](https://www.football-data.org) | Matches, standings, scorers, H2H | 10 req/min (no daily cap) |
| [API-Football](https://www.api-football.com) | Lineups, injuries (when available) | 100 req/day |
| [Google Gemini](https://aistudio.google.com) | AI enrichment — lineups, injuries, ratings, cards, analysis | Free tier |

When API-Football can't provide data (e.g. current season not on free plan), Gemini AI fills the gap with predictions marked by a violet "AI-estimated" badge.

## Getting Started

### Prerequisites

- Node.js 20+
- Free API keys from the three services above

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/akachi11/football-bet-analyzer.git
cd football-bet-analyzer
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
FOOTBALL_DATA_API_KEY=your_key_here
API_FOOTBALL_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  api/
    matches/         # Today's matches + match detail endpoints
    enrich/          # Gemini AI enrichment (ratings, lineups, injuries)
    analysis/        # Gemini AI betting analysis
  match/[id]/        # Match detail page
components/
  tabs/              # Overview, Stats, Lineups, Analysis tab components
hooks/
  use-matches.ts     # Data fetching + enrichment application
lib/
  football-data.ts   # Football-Data.org API client
  api-football.ts    # API-Football client
  match-service.ts   # Orchestrates data from all sources
  cache.ts           # In-memory TTL cache
  config.ts          # Competition mappings, cache TTL constants
  types.ts           # TypeScript interfaces
```

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router)
- **Language** — TypeScript 5
- **Styling** — Tailwind CSS 4
- **Animations** — Framer Motion
- **AI** — Google Gemini (generative AI)
- **Icons** — Lucide React

## How It Works

1. **Football-Data.org** provides the core data: today's matches, standings, scorers, head-to-head history, and recent results
2. **API-Football** supplements with confirmed lineups and injuries when available
3. **Gemini AI** fills any data gaps — predicting lineups, estimating injuries/suspensions, generating player ratings, disciplinary stats, and full match analysis with betting predictions
4. All AI-generated data is clearly marked with a violet **AI-estimated** badge so you know what's real vs. predicted
5. **Smart caching** with request deduplication prevents redundant API calls and keeps you within free tier limits

## License

MIT
