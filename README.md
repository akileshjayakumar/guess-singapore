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

## Capabilities
- Daily Singapore-focused words across `food`, `places`, and `singlish`
- 6-try Wordle gameplay with tile + keyboard feedback
- AI-powered Merlion assistant for hints, reactions, fun facts, and explanations
- Player profiles and leaderboard backed by Supabase

## Configuration
- `PERPLEXITY_API_KEY`: Required for related integrations/features.

## Usage
```bash
npm run dev
```

## Contributing and Testing
- Contributions are welcome through pull requests with clear, scoped changes.
- Run the following checks before submitting changes:
```bash
npm run lint
npm run build
```

## License
Licensed under the `MIT` license. See [LICENSE](./LICENSE) for full text.
