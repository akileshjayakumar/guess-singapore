# GuessSG

A Singapore-themed Wordle-style game where players guess local words in 6 tries, with AI hints and leaderboard tracking.

## Quick Start

```bash
npm install
cat > .env.local <<'ENV'
PERPLEXITY_API_KEY=your_perplexity_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
ENV
npm run dev
```

Open `http://localhost:3000`.

## Core Capabilities

- Daily Singapore-focused words across `food`, `places`, and `singlish`
- 6-try Wordle gameplay with tile + keyboard feedback
- AI-powered Merlion assistant for hints, reactions, fun facts, and explanations
- Player profiles and leaderboard backed by Supabase
- Local game stats and streak tracking

## Configuration

Create `.env.local` with:

```env
PERPLEXITY_API_KEY=your_perplexity_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
# optional fallback key name supported by the app:
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key
```

Required behavior:

- `PERPLEXITY_API_KEY` enables `/api/ai` and `/api/daily-word`
- Supabase env vars are required for player setup and leaderboard persistence

## Usage

1. Start the app and choose a category.
2. Enter guesses using keyboard or on-screen keys.
3. Use `Hint` or `Ask Merlion` for AI help.
4. Finish the round and check streak + leaderboard.

## Contributing and Testing

```bash
npm run lint
npm run build
```

Pull requests should include a short summary and validation notes (lint/build status).

## License

MIT. See `LICENSE`.
