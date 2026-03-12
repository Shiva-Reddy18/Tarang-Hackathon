import { useState, useEffect, useCallback, useRef } from 'react';
import { Bug, Trophy, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';

interface BugConfig {
  id: number;
  x: number;
  y: number;
  createdAt: number;
  type: 'normal' | 'fast';
}

const GAME_DURATION = 30; // seconds
const MAX_BUGS = 6;
const BUG_LIFETIME = 8000; // ms
const SPAWN_INTERVAL = 6000; // ms

interface ArenaGameProps {
  onGameComplete?: (score: number) => void;
}

export default function ArenaGame({ onGameComplete }: ArenaGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [bugs, setBugs] = useState<BugConfig[]>([]);
  const [gameOver, setGameOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const nextBugId = useRef(0);
  const { team } = useAppStore();

  const spawnBug = useCallback(() => {
    if (!containerRef.current || bugs.length >= MAX_BUGS) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const bugSize = 40; // approx bug size
    
    // Ensure bugs spawn within container bounds
    const maxX = Math.max(0, container.width - bugSize);
    const maxY = Math.max(0, container.height - bugSize);
    
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);
    
    const newBug: BugConfig = {
      id: nextBugId.current++,
      x,
      y,
      createdAt: Date.now(),
      type: Math.random() > 0.8 ? 'fast' : 'normal'
    };
    
    setBugs(prev => [...prev, newBug]);
  }, [bugs.length]);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setBugs([]);
    nextBugId.current = 0;
    spawnBug();
  };

  // Game timer loop
  useEffect(() => {
    let timerId: number;
    if (isPlaying && timeLeft > 0) {
      timerId = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isPlaying && timeLeft === 0) {
      setIsPlaying(false);
      setGameOver(true);
      setBugs([]);
      if (onGameComplete) onGameComplete(score);
      saveScore(score);
    }
    return () => clearInterval(timerId);
  }, [isPlaying, timeLeft, score, onGameComplete]);

  // Bug spawner loop
  useEffect(() => {
    let spawnerId: number;
    if (isPlaying) {
      spawnerId = window.setInterval(() => {
        spawnBug();
      }, SPAWN_INTERVAL);
    }
    return () => clearInterval(spawnerId);
  }, [isPlaying, spawnBug]);

  // Bug lifetime loop (cleanup old bugs)
  useEffect(() => {
    let cleanerId: number;
    if (isPlaying) {
      cleanerId = window.setInterval(() => {
        const now = Date.now();
        setBugs(prev => prev.filter(bug => now - bug.createdAt < BUG_LIFETIME));
      }, 1000);
    }
    return () => clearInterval(cleanerId);
  }, [isPlaying]);

  const saveScore = async (finalScore: number) => {
    if (!team) return;
    try {
      // Upsert score to leaderboard
      const { error } = await supabase.from('leaderboard').upsert({
        team_id: team.id,
        score: finalScore,
        updated_at: new Date().toISOString()
      }, { onConflict: 'team_id' });
      
      if (error) console.error('Error saving score:', error);
    } catch (e) {
      console.error('Failed to save score:', e);
    }
  };

  const handleBugClick = (e: React.MouseEvent | React.KeyboardEvent, id: number, type: 'normal' | 'fast') => {
    e.stopPropagation();
    if (!isPlaying) return;
    
    const points = type === 'fast' ? 20 : 10;
    setScore(prev => prev + points);
    setBugs(prev => prev.filter(b => b.id !== id));
  };

  const handleBackgroundClick = () => {
    if (isPlaying) {
      setScore(prev => Math.max(0, prev - 2)); // Penalty for miss
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto space-y-4">
      
      {/* HUD */}
      <div className="flex items-center justify-between w-full p-4 glass-panel rounded-xl">
        <div className="flex items-center space-x-2 text-brand-saffron font-bold text-xl">
          <Trophy className="w-6 h-6" />
          <span>Score: {score}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-brand-cyan font-bold text-xl">
          <Clock className="w-6 h-6" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Game Arena */}
      <div 
        ref={containerRef}
        className={cn(
          "relative w-full h-[400px] border-2 rounded-xl overflow-hidden cursor-crosshair transition-colors duration-300",
          isPlaying ? "bg-slate-900 border-brand-cyan/50" : "bg-slate-800 border-slate-700",
        )}
        onClick={handleBackgroundClick}
      >
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
            <h3 className="text-3xl font-bold text-white mb-2">Bug Hunter</h3>
            <p className="text-slate-300 mb-6 max-w-md text-center">
              Catch bugs to earn points! Click on bugs (+10 pts). Don't miss (-2 pts). You have {GAME_DURATION} seconds.
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-brand-cyan text-slate-900 font-bold rounded-full hover:scale-105 transition-transform"
            >
              Start Game
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-10">
            <h3 className="text-4xl font-bold text-brand-saffron mb-2">Time's Up!</h3>
            <p className="text-2xl text-white mb-6">Final Score: {score}</p>
            <p className="text-sm text-slate-400 mb-6">Score simulated and saving to leaderboard...</p>
            <button
              onClick={startGame}
              className="px-6 py-2 border border-brand-cyan text-brand-cyan font-bold rounded-full hover:bg-brand-cyan/10 transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Render Bugs */}
        {isPlaying && bugs.map(bug => (
          <button
            key={bug.id}
            className={cn(
              "absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-full outline-none focus:ring-2 focus:ring-brand-saffron transition-transform hover:scale-110",
              bug.type === 'fast' ? "text-brand-saffron animate-pulse" : "text-brand-cyan"
            )}
            style={{ 
              left: bug.x, 
              top: bug.y,
              transition: 'left 0.5s ease-out, top 0.5s ease-out', // smooth movement if we want moving bugs
            }}
            onClick={(e) => handleBugClick(e, bug.id, bug.type)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleBugClick(e as any, bug.id, bug.type);
              }
            }}
            aria-label="Catch bug"
          >
            <Bug className={cn(
              "w-8 h-8",
              bug.type === 'fast' && "w-10 h-10"
            )} />
          </button>
        ))}
      </div>
    </div>
  );
}
