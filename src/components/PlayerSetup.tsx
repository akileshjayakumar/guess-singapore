"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase, Player } from "@/lib/supabase";
import { Leaderboard } from "@/components/Leaderboard";

interface PlayerSetupProps {
  onComplete: (player: Player | null) => void;
}

export function PlayerSetup({ onComplete }: PlayerSetupProps) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const handleCreateProfile = async () => {
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    if (nickname.length < 3) {
      setError("Nickname must be at least 3 characters");
      return;
    }

    if (nickname.length > 15) {
      setError("Nickname must be 15 characters or less");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("players")
        .insert({ nickname: nickname.trim() })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        if (dbError.code === "23505") {
          setError("This nickname is already taken. Try another!");
        } else {
          setError(
            `Database error: ${
              dbError.message || "Something went wrong. Please try again."
            }`
          );
        }
        return;
      }

      localStorage.setItem("sg-wordle-player", JSON.stringify(data));
      onComplete(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginExisting = async () => {
    if (!nickname.trim()) {
      setError("Please enter your nickname");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("players")
        .select()
        .ilike("nickname", nickname.trim())
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        setError(
          `Database error: ${
            dbError.message ||
            "Nickname not found. Check spelling or create a new profile."
          }`
        );
        return;
      }

      if (!data) {
        setError("Nickname not found. Check spelling or create a new profile.");
        return;
      }

      localStorage.setItem("sg-wordle-player", JSON.stringify(data));
      onComplete(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAsGuest = () => {
    localStorage.removeItem("sg-wordle-player");
    onComplete(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          onClick={() => setShowLeaderboard(true)}
          className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-700 shadow-lg ring-1 ring-emerald-100 hover:bg-white transition-all"
          aria-label="Open leaderboard"
        >
          <span className="text-base sm:text-lg">🏆</span>
          <span className="font-medium">Leaderboard</span>
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight mb-2 text-gray-900">
          GuessSG
        </h1>
        <p className="text-base sm:text-lg text-gray-500 font-light">
          Welcome! How would you like to play?
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
      >
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setIsReturning(false);
              setError(null);
              setNickname("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              !isReturning
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            New Player
          </button>
          <button
            onClick={() => {
              setIsReturning(true);
              setError(null);
              setNickname("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              isReturning
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Returning Player
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isReturning
              ? "Enter your existing nickname"
              : "Create a profile to save your stats"}
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              (isReturning ? handleLoginExisting() : handleCreateProfile())
            }
            placeholder={isReturning ? "Your nickname" : "Enter your nickname"}
            maxLength={15}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm mt-2"
            >
              {error}
            </motion.p>
          )}
        </div>

        <button
          onClick={isReturning ? handleLoginExisting : handleCreateProfile}
          disabled={loading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 mb-3"
        >
          {loading
            ? isReturning
              ? "Logging in..."
              : "Creating..."
            : isReturning
            ? "Continue"
            : "Create Profile"}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400">or</span>
          </div>
        </div>

        <button
          onClick={handlePlayAsGuest}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all"
        >
          Play as Guest
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Guest stats are saved locally and won&apos;t appear on the leaderboard
        </p>
      </motion.div>
      <Leaderboard
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        currentPlayer={null}
      />
    </div>
  );
}
