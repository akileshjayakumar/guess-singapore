"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LeaderboardEntry {
  nickname: string;
  games_played: number;
  games_won: number;
  win_rate: number;
  avg_attempts: number;
}

interface LeaderboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer?: string | null;
}

export function Leaderboard({
  open,
  onOpenChange,
  currentPlayer,
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"wins" | "rate" | "games">("wins");

  useEffect(() => {
    if (open) {
      fetchLeaderboard();
    }
  }, [open, sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, nickname");

      if (playersError) {
        console.error("Error fetching players:", playersError);
        setEntries([]);
        setLoading(false);
        return;
      }

      if (!players || players.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const { data: results, error: resultsError } = await supabase
        .from("game_results")
        .select("player_id, won, attempts");

      if (resultsError) {
        console.error("Error fetching game results:", resultsError);
        setEntries([]);
        setLoading(false);
        return;
      }

      if (!results) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const statsMap = new Map<
        string,
        { played: number; won: number; totalAttempts: number }
      >();

      results.forEach((result) => {
        const current = statsMap.get(result.player_id) || {
          played: 0,
          won: 0,
          totalAttempts: 0,
        };
        current.played++;
        if (result.won) {
          current.won++;
          current.totalAttempts += result.attempts;
        }
        statsMap.set(result.player_id, current);
      });

      const leaderboard: LeaderboardEntry[] = players
        .map((player) => {
          const stats = statsMap.get(player.id) || {
            played: 0,
            won: 0,
            totalAttempts: 0,
          };
          return {
            nickname: player.nickname,
            games_played: stats.played,
            games_won: stats.won,
            win_rate:
              stats.played > 0
                ? Math.round((stats.won / stats.played) * 100)
                : 0,
            avg_attempts:
              stats.won > 0
                ? Number((stats.totalAttempts / stats.won).toFixed(1))
                : 0,
          };
        })
        .filter((entry) => entry.games_played > 0);

      leaderboard.sort((a, b) => {
        if (sortBy === "wins") return b.games_won - a.games_won;
        if (sortBy === "rate") return b.win_rate - a.win_rate;
        return b.games_played - a.games_played;
      });

      setEntries(leaderboard.slice(0, 50));
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-[95vw] sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-display text-center text-gray-900">
            🏆 Leaderboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center gap-2 mb-4">
          {[
            { key: "wins", label: "Most Wins" },
            { key: "rate", label: "Win Rate" },
            { key: "games", label: "Most Games" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as "wins" | "rate" | "games")}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                sortBy === key
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="text-3xl mb-2 inline-block"
              >
                🦁
              </motion.div>
              <p>Loading leaderboard...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">🏆</p>
              <p>No players yet. Be the first!</p>
            </div>
          ) : (
            <AnimatePresence>
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.nickname}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 ${
                    entry.nickname === currentPlayer
                      ? "bg-emerald-50 -mx-3 px-3 rounded-lg"
                      : ""
                  }`}
                >
                  <div className="w-8 text-center font-bold text-lg">
                    {getMedal(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate flex items-center gap-1">
                      {entry.nickname}
                      {entry.nickname === currentPlayer && (
                        <span className="text-emerald-600 text-xs">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.games_played} games • {entry.win_rate}% win rate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">
                      {entry.games_won}
                    </div>
                    <div className="text-xs text-gray-400">wins</div>
                  </div>
                  {entry.avg_attempts > 0 && (
                    <div className="text-right">
                      <div className="font-medium text-gray-600">
                        {entry.avg_attempts}
                      </div>
                      <div className="text-xs text-gray-400">avg</div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
