import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable"
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type Player = {
  id: string;
  nickname: string;
  created_at: string;
};

export type GameResult = {
  id: string;
  player_id: string;
  word: string;
  attempts: number;
  won: boolean;
  played_at: string;
};

export type LeaderboardEntry = {
  nickname: string;
  games_played: number;
  games_won: number;
  win_rate: number;
  avg_attempts: number;
  best_streak: number;
};
