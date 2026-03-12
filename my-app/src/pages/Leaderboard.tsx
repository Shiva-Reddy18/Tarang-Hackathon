import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal, Star, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store';

interface LeaderboardEntry {
  id: string;
  score: number;
  teams: {
    team_name: string;
    project_title: string;
    status: string;
  };
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { team } = useAppStore();

  const fetchLeaderboard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leaderboard')
      .select(`
        id,
        score,
        team_id,
        teams (
          team_name,
          project_title,
          status
        )
      `)
      .order('score', { ascending: false })
      .limit(20);

    if (!error && data) {
      setLeaders(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime updates
    const channel = supabase.channel('public:leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard' },
        (payload) => {
          console.log('Realtime Leaderboard update!', payload);
          fetchLeaderboard(); // Refetch for simplicity, could also merge payload optimally
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-4xl mx-auto w-full">
      <div className="text-center mb-8">
        <Trophy className="w-16 h-16 text-brand-saffron mx-auto mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        <h2 className="text-4xl font-black tracking-tight text-white mb-2 uppercase">Global Rank</h2>
        <p className="text-slate-400">Top 20 Teams in the Arena</p>
      </div>

      <div className="w-full glass-panel rounded-2xl overflow-hidden shadow-2xl relative">
        <button 
          onClick={fetchLeaderboard}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-2"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        
        <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex text-xs font-bold uppercase text-slate-400 tracking-wider">
          <div className="w-16 text-center">Rank</div>
          <div className="flex-1">Team Identity</div>
          <div className="w-32 text-center hidden md:block">Status</div>
          <div className="w-24 text-right pr-4">Score</div>
        </div>

        <div className="divide-y divide-slate-700/50">
          {loading && leaders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">Scanning Arena data...</div>
          ) : leaders.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No scores recorded yet. The arena is silent.</div>
          ) : (
            leaders.map((entry, index) => {
              const rank = index + 1;
              const isCurrentUserTeam = team?.id === (entry as any).team_id;
              
              let RankIcon = null;
              if (rank === 1) RankIcon = <Trophy className="w-5 h-5 text-yellow-400 mx-auto" />;
              else if (rank === 2) RankIcon = <Medal className="w-5 h-5 text-slate-300 mx-auto" />;
              else if (rank === 3) RankIcon = <Medal className="w-5 h-5 text-amber-700 mx-auto" />;
              else RankIcon = <span className="text-slate-500 font-mono text-lg">{rank}</span>;

              return (
                <div 
                  key={entry.id} 
                  className={`px-6 py-4 flex items-center transition-colors hover:bg-slate-800/30 ${
                    isCurrentUserTeam ? 'bg-brand-cyan/10 border-l-4 border-l-brand-cyan' : ''
                  }`}
                >
                  <div className="w-16 text-center">{RankIcon}</div>
                  
                  <div className="flex-1 px-4">
                    <div className="flex items-center">
                      <h4 className={`font-bold text-lg ${isCurrentUserTeam ? 'text-brand-cyan' : 'text-white'}`}>
                        {entry.teams.team_name}
                      </h4>
                      {isCurrentUserTeam && <span className="ml-2 text-xs bg-brand-cyan text-slate-900 px-2 py-0.5 rounded-full font-bold">YOU</span>}
                    </div>
                    {entry.teams.project_title && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
                        {entry.teams.project_title}
                      </p>
                    )}
                  </div>
                  
                  <div className="w-32 text-center hidden md:block">
                    <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 capitalize border border-slate-700">
                      {entry.teams.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="w-24 text-right pr-4">
                    <div className="font-mono text-xl font-bold text-brand-saffron flex items-center justify-end">
                      {entry.score} <Star className="w-4 h-4 ml-1 text-brand-saffron/50" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
