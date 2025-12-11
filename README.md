# GuessSG

A Wordle-style word guessing game with a Singapore theme. Guess Singapore related words in 6 tries with real-time feedback. Features AI-powered hints.

## Features

- Daily challenge with words related to Singapore
- AI-powered hints using Perplexity API
- Real-time feedback on guesses

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Animations**: Framer Motion
- **UI Components**: Radix UI
- **AI**: Perplexity API

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables (`.env.local`):

```bash
PERPLEXITY_API_KEY=your_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

3. Run the development server:

```bash
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
