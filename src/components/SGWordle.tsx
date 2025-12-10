"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Category, WordData, fetchDailyWord } from "@/lib/words";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import confetti from "canvas-confetti";
import { useAI } from "@/hooks/useAI";
import ReactMarkdown from "react-markdown";
import { PlayerSetup } from "@/components/PlayerSetup";
import { Leaderboard } from "@/components/Leaderboard";
import { supabase, Player } from "@/lib/supabase";

type TileState = "empty" | "filled" | "correct" | "present" | "absent";

interface Tile {
  letter: string;
  state: TileState;
}

interface ChatMessage {
  role: "user" | "merlion";
  content: string;
}

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

const CATEGORY_INFO: Record<Category, { label: string; subtitle: string; icon: string; color: string }> = {
  food: { label: "Local Eats", subtitle: "Hawker favorites & dishes", icon: "🍜", color: "from-orange-500 to-red-500" },
  places: { label: "Landmarks", subtitle: "Iconic spots to visit", icon: "🏙️", color: "from-blue-500 to-cyan-500" },
  singlish: { label: "Local Slang", subtitle: "Uniquely Singaporean lingo", icon: "🗣️", color: "from-emerald-500 to-teal-500" },
  all: { label: "Mix It Up", subtitle: "A bit of everything!", icon: "🎲", color: "from-rose-500 to-amber-500" },
};

export function SGWordle() {
  const [playerChecked, setPlayerChecked] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const [category, setCategory] = useState<Category | null>(null);
  const [currentWord, setCurrentWord] = useState<WordData | null>(null);
  const [guesses, setGuesses] = useState<Tile[][]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [currentRow, setCurrentRow] = useState(0);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");
  const [shake, setShake] = useState(false);
  const [flipRow, setFlipRow] = useState<number | null>(null);
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, TileState>>({});
  const [showHint, setShowHint] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState({ played: 0, won: 0, streak: 0, maxStreak: 0 });
  const [loadingWord, setLoadingWord] = useState(false);

  const [showMerlionChat, setShowMerlionChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiReaction, setAiReaction] = useState<string | null>(null);
  const [funFact, setFunFact] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const ai = useAI({
    word: currentWord?.word || "",
    category: currentWord?.category || "all",
    hint: currentWord?.hint,
  });

  const maxGuesses = 6;

  useEffect(() => {
    const savedPlayer = localStorage.getItem("sg-wordle-player");
    const savedIsGuest = localStorage.getItem("sg-wordle-is-guest");
    if (savedPlayer) {
      try {
        setPlayer(JSON.parse(savedPlayer));
      } catch {
        localStorage.removeItem("sg-wordle-player");
      }
    } else if (savedIsGuest === "true") {
      setIsGuest(true);
    }
    setPlayerChecked(true);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("sg-wordle-stats");
    if (saved) setStats(JSON.parse(saved));
    const savedStreak = localStorage.getItem("sg-wordle-streak");
    if (savedStreak) setStreak(parseInt(savedStreak));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const saveGameResult = async (won: boolean, attempts: number, word: string) => {
    if (!player) return;
    
    try {
      await supabase.from("game_results").insert({
        player_id: player.id,
        word,
        attempts,
        won,
      });
    } catch (error) {
      console.error("Failed to save game result:", error);
    }
  };

  const saveStats = (won: boolean) => {
    const newStats = {
      played: stats.played + 1,
      won: stats.won + (won ? 1 : 0),
      streak: won ? stats.streak + 1 : 0,
      maxStreak: won ? Math.max(stats.maxStreak, stats.streak + 1) : stats.maxStreak,
    };
    setStats(newStats);
    localStorage.setItem("sg-wordle-stats", JSON.stringify(newStats));
    
    if (won) {
      setStreak(s => s + 1);
      localStorage.setItem("sg-wordle-streak", String(streak + 1));
    } else {
      setStreak(0);
      localStorage.setItem("sg-wordle-streak", "0");
    }
  };

  const startGame = async (cat: Category) => {
    setCategory(cat);
    setLoadingWord(true);
    setCurrentWord(null);
    setGuesses([]);
    setCurrentGuess("");
    setCurrentRow(0);
    setGameStatus("playing");
    setKeyboardStatus({});
    setShowHint(false);
    setChatMessages([]);
    setShowMerlionChat(false);
    setAiReaction(null);
    setFunFact(null);
    setExplanation(null);

    try {
      const word = await fetchDailyWord(cat);
      setCurrentWord(word);
      setGuesses(Array(6).fill(null).map(() => 
        Array(word.word.length).fill({ letter: "", state: "empty" })
      ));
    } catch (error) {
      console.error("Failed to start game:", error);
    } finally {
      setLoadingWord(false);
    }
  };

  const celebrateWin = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ["#e63946", "#ffd166", "#06d6a0", "#ff6b6b"];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const fetchAIReaction = async (won: boolean, tries: number) => {
    setLoadingAI("reaction");
    const reaction = await ai.getReaction(won, tries);
    if (reaction) setAiReaction(reaction);
    setLoadingAI(null);
  };

  const fetchFunFact = async () => {
    setLoadingAI("funfact");
    const fact = await ai.getFunFact();
    if (fact) setFunFact(fact);
    setLoadingAI(null);
  };

  const fetchExplanation = async () => {
    setLoadingAI("explain");
    const exp = await ai.getExplanation();
    if (exp) setExplanation(exp);
    setLoadingAI(null);
  };

  const askMerlion = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoadingAI("chat");

    try {
      const response = await ai.getHint(userMessage);
      if (response) {
        setChatMessages(prev => [...prev, { role: "merlion", content: response }]);
      }
    } finally {
      setLoadingAI(null);
    }
  };

  const submitGuess = useCallback(() => {
    if (!currentWord || currentGuess.length !== currentWord.word.length) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const guessUpper = currentGuess.toUpperCase();
    const wordUpper = currentWord.word.toUpperCase();
    
    const newTiles: Tile[] = [];
    const letterCount: Record<string, number> = {};
    
    for (const letter of wordUpper) {
      letterCount[letter] = (letterCount[letter] || 0) + 1;
    }

    const exactMatches = new Set<number>();
    for (let i = 0; i < guessUpper.length; i++) {
      if (guessUpper[i] === wordUpper[i]) {
        exactMatches.add(i);
        letterCount[guessUpper[i]]--;
      }
    }

    for (let i = 0; i < guessUpper.length; i++) {
      const letter = guessUpper[i];
      let state: TileState;

      if (exactMatches.has(i)) {
        state = "correct";
      } else if (letterCount[letter] > 0) {
        state = "present";
        letterCount[letter]--;
      } else {
        state = "absent";
      }

      newTiles.push({ letter, state });
    }

    const newGuesses = [...guesses];
    newGuesses[currentRow] = newTiles;
    setGuesses(newGuesses);
    setFlipRow(currentRow);

    const newKeyboardStatus = { ...keyboardStatus };
    newTiles.forEach(tile => {
      const current = newKeyboardStatus[tile.letter];
      if (tile.state === "correct" || (tile.state === "present" && current !== "correct") || 
          (tile.state === "absent" && !current)) {
        newKeyboardStatus[tile.letter] = tile.state;
      }
    });
    setKeyboardStatus(newKeyboardStatus);

    setTimeout(() => {
      setFlipRow(null);
      
      if (guessUpper === wordUpper) {
        setGameStatus("won");
        saveStats(true);
        saveGameResult(true, currentRow + 1, currentWord.word);
        celebrateWin();
        fetchAIReaction(true, currentRow + 1);
      } else if (currentRow >= maxGuesses - 1) {
        setGameStatus("lost");
        saveStats(false);
        saveGameResult(false, currentRow + 1, currentWord.word);
        fetchAIReaction(false, currentRow + 1);
      } else {
        setCurrentRow(currentRow + 1);
        setCurrentGuess("");
      }
    }, currentWord.word.length * 150 + 200);
  }, [currentGuess, currentWord, currentRow, guesses, keyboardStatus, maxGuesses, player]);

  const handleKey = useCallback((key: string) => {
    if (gameStatus !== "playing" || !currentWord) return;

    if (key === "ENTER") {
      submitGuess();
    } else if (key === "⌫" || key === "BACKSPACE") {
      setCurrentGuess(prev => prev.slice(0, -1));
    } else if (key.length === 1 && /[A-Z]/i.test(key) && currentGuess.length < currentWord.word.length) {
      const newGuess = currentGuess + key.toUpperCase();
      setCurrentGuess(newGuess);
      
      if (newGuess.length === currentWord.word.length) {
        setTimeout(() => {
          const guessUpper = newGuess.toUpperCase();
          const wordUpper = currentWord.word.toUpperCase();
          
          const newTiles: Tile[] = [];
          const letterCount: Record<string, number> = {};
          
          for (const letter of wordUpper) {
            letterCount[letter] = (letterCount[letter] || 0) + 1;
          }

          const exactMatches = new Set<number>();
          for (let i = 0; i < guessUpper.length; i++) {
            if (guessUpper[i] === wordUpper[i]) {
              exactMatches.add(i);
              letterCount[guessUpper[i]]--;
            }
          }

          for (let i = 0; i < guessUpper.length; i++) {
            const letter = guessUpper[i];
            let state: TileState;

            if (exactMatches.has(i)) {
              state = "correct";
            } else if (letterCount[letter] > 0) {
              state = "present";
              letterCount[letter]--;
            } else {
              state = "absent";
            }

            newTiles.push({ letter, state });
          }

          const newGuesses = [...guesses];
          newGuesses[currentRow] = newTiles;
          setGuesses(newGuesses);
          setFlipRow(currentRow);

          const newKeyboardStatus = { ...keyboardStatus };
          newTiles.forEach(tile => {
            const current = newKeyboardStatus[tile.letter];
            if (tile.state === "correct" || (tile.state === "present" && current !== "correct") || 
                (tile.state === "absent" && !current)) {
              newKeyboardStatus[tile.letter] = tile.state;
            }
          });
          setKeyboardStatus(newKeyboardStatus);

          setTimeout(() => {
            setFlipRow(null);
            
            if (guessUpper === wordUpper) {
              setGameStatus("won");
              saveStats(true);
              saveGameResult(true, currentRow + 1, currentWord.word);
              celebrateWin();
              fetchAIReaction(true, currentRow + 1);
            } else if (currentRow >= maxGuesses - 1) {
              setGameStatus("lost");
              saveStats(false);
              saveGameResult(false, currentRow + 1, currentWord.word);
              fetchAIReaction(false, currentRow + 1);
            } else {
              setCurrentRow(currentRow + 1);
              setCurrentGuess("");
            }
          }, currentWord.word.length * 150 + 200);
        }, 100);
      }
    }
  }, [currentGuess, currentWord, currentRow, guesses, keyboardStatus, maxGuesses, gameStatus, player]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle keyboard events when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      handleKey(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  useEffect(() => {
    if (!currentWord) return;
    const newGuesses = [...guesses];
    if (newGuesses[currentRow]) {
      newGuesses[currentRow] = Array(currentWord.word.length).fill(null).map((_, i) => ({
        letter: currentGuess[i] || "",
        state: currentGuess[i] ? "filled" : "empty" as TileState,
      }));
      setGuesses(newGuesses);
    }
  }, [currentGuess, currentWord]);

  if (!playerChecked) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-4xl"
        >
          🦁
        </motion.div>
      </div>
    );
  }

  if (playerChecked && !player && !isGuest && !category) {
    return (
      <PlayerSetup
        onComplete={(p) => {
          if (p) {
            setPlayer(p);
          } else {
            setIsGuest(true);
            localStorage.setItem("sg-wordle-is-guest", "true");
          }
        }}
      />
    );
  }

  if (!category) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 bg-gray-50 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-10 md:mb-12"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-2 sm:mb-4 text-gray-900">
            GuessSG
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 font-light">
            guess singapore in 6 tries
          </p>
          {player && (
            <p className="text-sm text-emerald-600 mt-2">
              Playing as <span className="font-bold">{player.nickname}</span>
            </p>
          )}
          {isGuest && !player && (
            <p className="text-sm text-gray-500 mt-2">
              Playing as <span className="font-bold">Guest</span>
            </p>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 sm:gap-4 max-w-xs sm:max-w-sm md:max-w-lg w-full px-2 sm:px-0"
        >
          {(Object.entries(CATEGORY_INFO) as [Category, typeof CATEGORY_INFO[Category]][]).map(([cat, info], i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(cat)}
              className={`relative overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 bg-gradient-to-br ${info.color} shadow-lg group`}
            >
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
              <div className="relative z-10">
                <span className="text-2xl sm:text-3xl md:text-4xl mb-2 sm:mb-3 block">{info.icon}</span>
                <span className="text-base sm:text-lg md:text-xl font-bold text-white block">{info.label}</span>
                <span className="text-[10px] sm:text-xs text-white/80 block mt-1">{info.subtitle}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 sm:mt-8 flex items-center gap-4"
        >
          <button
            onClick={() => setShowStats(true)}
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            📊 Stats
          </button>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            🏆 Leaderboard
          </button>
          {(player || isGuest) && (
            <button
              onClick={() => {
                localStorage.removeItem("sg-wordle-player");
                localStorage.removeItem("sg-wordle-is-guest");
                setPlayer(null);
                setIsGuest(false);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
            >
              Switch Profile
            </button>
          )}
        </motion.div>

        <Dialog open={showStats} onOpenChange={setShowStats}>
          <DialogContent className="bg-white border-gray-200 max-w-[90vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-display text-center text-gray-900">Your Stats</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-2 sm:gap-4 py-4 sm:py-6">
              {[
                { label: "Played", value: stats.played },
                { label: "Win %", value: stats.played ? Math.round((stats.won / stats.played) * 100) : 0 },
                { label: "Streak", value: stats.streak },
                { label: "Max", value: stats.maxStreak },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stat.value}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Leaderboard
          open={showLeaderboard}
          onOpenChange={setShowLeaderboard}
          currentPlayer={player?.nickname}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center p-2 sm:p-3 md:p-4 bg-gray-50 overflow-y-auto">
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl flex flex-col h-full">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 sm:mb-6"
        >
          <button
            onClick={() => setCategory(null)}
            className="text-gray-500 hover:text-gray-700 transition-colors text-xs sm:text-sm flex items-center gap-1"
          >
            ← Back
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xl sm:text-2xl">{CATEGORY_INFO[category].icon}</span>
            <span className="font-bold text-sm sm:text-base md:text-lg text-gray-900">{CATEGORY_INFO[category].label}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {streak > 0 && (
              <span className="text-amber-600 text-xs sm:text-sm">🔥 {streak}</span>
            )}
            <button
              onClick={() => setShowLeaderboard(true)}
              className="text-amber-600 hover:text-amber-700 transition-colors"
            >
              🏆
            </button>
            <button
              onClick={() => setShowStats(true)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              📊
            </button>
          </div>
        </motion.div>

        {loadingWord ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-4xl sm:text-5xl mb-3 sm:mb-4"
            >
              🦁
            </motion.div>
            <p className="text-gray-500 text-base sm:text-lg">Generating today's word...</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">powered by perplexity api</p>
          </div>
        ) : (
          <>
            <div className={`mb-4 sm:mb-6 ${shake ? "animate-shake" : ""}`}>
              {guesses.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1 mb-1 sm:mb-1.5">
                  {row.map((tile, tileIndex) => {
                    const wordLen = currentWord?.word.length || 5;
                    const tileSize = wordLen <= 5 
                      ? "w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 text-lg sm:text-xl md:text-2xl" 
                      : wordLen <= 7 
                        ? "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 text-base sm:text-lg md:text-xl"
                        : "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-sm sm:text-base md:text-lg";
                    
                    return (
                      <motion.div
                        key={tileIndex}
                        initial={false}
                        animate={{
                          rotateX: flipRow === rowIndex ? [0, 90, 0] : 0,
                        }}
                        transition={{
                          duration: 0.5,
                          delay: flipRow === rowIndex ? tileIndex * 0.15 : 0,
                        }}
                        className={`
                          ${tileSize} flex items-center justify-center font-bold
                          border-2 rounded-md sm:rounded-lg transition-all duration-300
                          ${tile.state === "empty" ? "border-gray-300 bg-white" : ""}
                          ${tile.state === "filled" ? "border-gray-400 bg-white scale-105" : ""}
                          ${tile.state === "correct" ? "bg-emerald-500 border-emerald-500 text-white" : ""}
                          ${tile.state === "present" ? "bg-amber-500 border-amber-500 text-white" : ""}
                          ${tile.state === "absent" ? "bg-gray-400 border-gray-400 text-white" : ""}
                        `}
                        style={{
                          transformStyle: "preserve-3d",
                        }}
                      >
                        {tile.letter}
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>

            {currentWord && gameStatus === "playing" && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center gap-2 mb-3 sm:mb-4 flex-wrap px-2"
              >
                <button
                  onClick={() => {
                    setShowHint(true);
                  }}
                  disabled={showHint}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm transition-all ${
                    showHint 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {showHint ? `💡 ${currentWord.hint}` : "💡 Hint"}
                </button>
                <button
                  onClick={() => setShowMerlionChat(true)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 transition-all flex items-center gap-1"
                >
                  🦁 Ask Merlion
                </button>
              </motion.div>
            )}

            <div className="flex flex-col gap-1 sm:gap-1.5">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="flex justify-center gap-0.5 sm:gap-1">
                  {row.map(key => {
                    const status = keyboardStatus[key];
                    const isSpecial = key === "ENTER" || key === "⌫";
                    
                    return (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleKey(key)}
                        className={`
                          ${isSpecial ? "px-2 sm:px-3 md:px-4 text-[10px] sm:text-xs md:text-sm" : "w-7 sm:w-8 md:w-10 lg:w-11"} 
                          h-10 sm:h-11 md:h-12 lg:h-14 rounded-md sm:rounded-lg font-bold text-xs sm:text-sm md:text-base
                          transition-all duration-200
                          ${status === "correct" ? "bg-emerald-500 text-white" : ""}
                          ${status === "present" ? "bg-amber-500 text-white" : ""}
                          ${status === "absent" ? "bg-gray-400 text-white" : ""}
                          ${!status ? "bg-gray-200 hover:bg-gray-300 text-gray-800" : ""}
                        `}
                      >
                        {key}
                      </motion.button>
                    );
                  })}
                </div>
              ))}
            </div>

            <Dialog open={showMerlionChat} onOpenChange={setShowMerlionChat}>
              <DialogContent className="bg-white border-gray-200 max-w-[95vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl font-display text-center text-gray-900 flex items-center justify-center gap-2">
                    🦁 Ask the Merlion
                  </DialogTitle>
                </DialogHeader>
                <div className="h-48 sm:h-64 overflow-y-auto bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center text-gray-400 py-6 sm:py-8">
                      <p className="text-3xl sm:text-4xl mb-2">🦁</p>
                      <p className="text-xs sm:text-sm">Ask me for hints lah! I help you guess the word sia.</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`mb-2 sm:mb-3 ${msg.role === "user" ? "text-right" : "text-left"}`}
                    >
                      <div
                        className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl max-w-[85%] sm:max-w-[80%] text-sm ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white rounded-br-sm"
                            : "bg-emerald-100 text-emerald-900 rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "merlion" ? (
                          <div className="prose prose-sm prose-emerald max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 [&_strong]:text-emerald-950">
                            <span className="mr-1">🦁</span>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  {loadingAI === "chat" && (
                    <div className="text-left mb-2 sm:mb-3">
                      <div className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-emerald-100 text-emerald-900 rounded-bl-sm text-sm">
                        🦁 <span className="animate-pulse">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askMerlion()}
                    placeholder="Ask for a hint..."
                    className="flex-1 px-3 sm:px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm sm:text-base"
                  />
                  <Button
                    onClick={askMerlion}
                    disabled={loadingAI === "chat" || !chatInput.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 sm:px-6 text-sm sm:text-base"
                  >
                    Send
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AnimatePresence>
              {gameStatus !== "playing" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
                >
                  <motion.div
                    initial={{ y: 20 }}
                    animate={{ y: 0 }}
                    className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 max-w-[90vw] sm:max-w-sm w-full text-center border border-gray-200 shadow-2xl my-4 sm:my-8"
                  >
                    {gameStatus === "won" ? (
                      <>
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.2 }}
                          className="text-5xl sm:text-6xl mb-3 sm:mb-4"
                        >
                          {currentWord?.emoji}
                        </motion.div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2 text-emerald-600">
                          Shiok ah!
                        </h2>
                        <p className="text-gray-500 mb-2 text-sm sm:text-base">You got it in {currentRow + 1} tries</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{currentWord?.word}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mb-4">{currentWord?.hint}</p>
                        {streak > 1 && (
                          <p className="text-amber-600 mb-4 text-sm sm:text-base">🔥 {streak} streak!</p>
                        )}
                      </>
                    ) : (
                      <>
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.2 }}
                          className="text-5xl sm:text-6xl mb-3 sm:mb-4"
                        >
                          😢
                        </motion.div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2 text-red-500">
                          Jialat!
                        </h2>
                        <p className="text-gray-500 mb-2 text-sm sm:text-base">The word was:</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{currentWord?.word}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mb-4">{currentWord?.hint}</p>
                      </>
                    )}

                    {aiReaction && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-blue-50 rounded-xl p-2 sm:p-3 mb-3 sm:mb-4 border border-blue-200"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-base">🦁</span>
                        </div>
                        <div className="prose prose-sm prose-blue max-w-none text-blue-800 [&>p]:mb-1 [&>p:last-child]:mb-0 [&_strong]:text-blue-950 text-xs sm:text-sm">
                          <ReactMarkdown>{aiReaction}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                      <button
                        onClick={fetchFunFact}
                        disabled={loadingAI === "funfact" || !!funFact}
                        className="w-full px-3 sm:px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs sm:text-sm transition-all disabled:opacity-50"
                      >
                        {loadingAI === "funfact" ? "Loading..." : funFact ? "✓ Fun Fact" : "🎯 Get Fun Fact"}
                      </button>
                      <button
                        onClick={fetchExplanation}
                        disabled={loadingAI === "explain" || !!explanation}
                        className="w-full px-3 sm:px-4 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs sm:text-sm transition-all disabled:opacity-50"
                      >
                        {loadingAI === "explain" ? "Loading..." : explanation ? "✓ Learn More" : "📚 Learn About This"}
                      </button>
                    </div>

                    {funFact && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 text-left border border-amber-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base sm:text-lg">🎯</span>
                          <span className="font-bold text-amber-800 text-xs sm:text-sm uppercase tracking-wide">Fun Fact</span>
                        </div>
                        <div className="prose prose-sm prose-amber max-w-none text-amber-900 [&>p]:mb-2 [&>p:last-child]:mb-0 [&_strong]:text-amber-950 text-xs sm:text-sm">
                          <ReactMarkdown>{funFact}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}

                    {explanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 text-left border border-purple-200"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base sm:text-lg">📚</span>
                          <span className="font-bold text-purple-800 text-xs sm:text-sm uppercase tracking-wide">Learn More</span>
                        </div>
                        <div className="prose prose-sm prose-purple max-w-none text-purple-900 [&>p]:mb-2 [&>p:last-child]:mb-0 [&_strong]:text-purple-950 text-xs sm:text-sm">
                          <ReactMarkdown>{explanation}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex gap-2 sm:gap-3">
                      <Button
                        onClick={() => setCategory(null)}
                        variant="outline"
                        className="flex-1 border-gray-300 hover:bg-gray-100 text-gray-700 text-sm sm:text-base"
                      >
                        Menu
                      </Button>
                      <Button
                        onClick={() => startGame(category)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm sm:text-base"
                      >
                        Play Again
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <Dialog open={showStats} onOpenChange={setShowStats}>
              <DialogContent className="bg-white border-gray-200 max-w-[90vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl sm:text-2xl font-display text-center text-gray-900">Your Stats</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-2 sm:gap-4 py-4 sm:py-6">
                  {[
                    { label: "Played", value: stats.played },
                    { label: "Win %", value: stats.played ? Math.round((stats.won / stats.played) * 100) : 0 },
                    { label: "Streak", value: stats.streak },
                    { label: "Max", value: stats.maxStreak },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{stat.value}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Leaderboard
              open={showLeaderboard}
              onOpenChange={setShowLeaderboard}
              currentPlayer={player?.nickname}
            />
          </>
        )}
      </div>
    </div>
  );
}