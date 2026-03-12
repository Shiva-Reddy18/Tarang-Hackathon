import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { Trophy, Loader2 } from 'lucide-react';

type LeaderboardRow = {
  id: string;
  team_id: string;
  score: number;
  judge_score: number;
  total_computed_score: number;
  updated_at: string;
  team?: {
    team_name: string;
    project_title: string;
    status: string;
  };
};

export default function Leaderboard() {
  const { user, loading: authLoading } = useAppStore();
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Strict internal protection
  if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'judge'))) {
    return <Navigate to="/arena" replace />;
  }

  // Final line of defense against manual URL access
  if (!authLoading && user && user.role !== 'admin' && user.role !== 'judge') {
    return <Navigate to="/arena" replace />;
  }

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase.channel('leaderboard_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaderboard' },
        () => fetchLeaderboard() // Re-fetch on any leaderboard change
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'judging_scores' },
        () => fetchLeaderboard() // Re-fetch on any judging score update
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Manual join via raw select string, since Typescript doesn't infer foreign tables well without the mapped type
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          id, team_id, score, judge_score, total_computed_score, updated_at,
          teams:team_id(team_name, project_title, status)
        `)
        .order('total_computed_score', { ascending: false });

      if (error) throw error;
      
      // Map the generic PostgREST return structure to our array
      const rows = (data as any[]).map(row => ({
        ...row,
        team: row.teams
      }));
      setBoard(rows);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-saffron animate-spin" />
          <p className="text-brand-saffron font-bold uppercase tracking-widest text-sm">Compiling Standings...</p>
        </div>
      </div>
    );
  }

  // Determine top 3
  const topTeams = board.slice(0, 3);
  const remainingTeams = board.slice(3);

  return (
    <div className="container mx-auto px-4 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tight mb-4 flex items-center justify-center gap-4">
          <Trophy className="w-10 h-10 md:w-16 md:h-16 text-brand-saffron animate-bounce" />
          Global Leaderboard
          <Trophy className="w-10 h-10 md:w-16 md:h-16 text-brand-saffron animate-bounce" />
        </h1>
        <p className="text-slate-400 text-lg">Observe the real-time ranking of the finest engineers in the arena.</p>
      </div>

      {board.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center border-dashed border-2 border-slate-700">
           <Trophy className="w-20 h-20 text-slate-700 mx-auto mb-6 opacity-30" />
           <p className="text-2xl font-bold text-slate-500 mb-2">No Standings Available</p>
           <p className="text-slate-600">The first points have yet to be awarded. Start hacking!</p>
        </div>
      ) : (
        <>
          {/* TOP 3 PODIUM */}
          <div className="flex flex-col md:flex-row justify-center items-end gap-6 mb-16 pt-8">
            
            {/* Rank 2 */}
            {topTeams[1] && (
               <div className="w-full md:w-1/3 order-2 md:order-1 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                 <div className="glass-panel p-6 rounded-t-2xl border-t-8 border-slate-300 text-center relative mt-8 md:mt-24 shadow-[0_-15px_30px_rgba(203,213,225,0.1)]">
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl">
                      <span className="text-2xl font-black text-slate-800">2</span>
                   </div>
                   <h3 className="font-black text-xl text-white mt-4 mb-1 truncate">{topTeams[1].team?.team_name || 'Ghost Team'}</h3>
                   <p className="text-slate-400 text-xs font-mono truncate mb-4">{topTeams[1].team?.project_title}</p>
                   <div className="bg-slate-900/80 rounded-lg p-3 inline-block border border-slate-700">
                      <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-200 to-slate-500">
                         {topTeams[1].total_computed_score}
                      </span>
                   </div>
                 </div>
               </div>
            )}

            {/* Rank 1 */}
            {topTeams[0] && (
               <div className="w-full md:w-1/3 order-1 md:order-2 animate-fade-in relative z-10" style={{ animationDelay: '0.4s' }}>
                 <div className="absolute -inset-1 bg-gradient-to-b from-brand-saffron to-brand-saffron/0 rounded-t-2xl blur-lg opacity-40"></div>
                 <div className="glass-panel p-8 rounded-t-2xl border-t-8 border-brand-saffron text-center relative shadow-[0_-20px_40px_rgba(245,158,11,0.2)]">
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 bg-brand-saffron rounded-full flex items-center justify-center border-4 border-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                      <Trophy className="w-10 h-10 text-slate-900" />
                   </div>
                   <h3 className="font-black text-2xl text-white mt-6 mb-1 truncate">{topTeams[0].team?.team_name || 'Ghost Team'}</h3>
                   <p className="text-brand-saffron/80 text-sm font-bold truncate mb-6">{topTeams[0].team?.project_title}</p>
                   <div className="bg-slate-900/90 rounded-xl p-4 inline-block border-2 border-brand-saffron/50 shadow-inner">
                      <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-brand-saffron to-yellow-600">
                         {topTeams[0].total_computed_score}
                      </span>
                   </div>
                 </div>
               </div>
            )}

            {/* Rank 3 */}
            {topTeams[2] && (
               <div className="w-full md:w-1/3 order-3 md:order-3 animate-fade-in" style={{ animationDelay: '0s' }}>
                 <div className="glass-panel p-6 rounded-t-2xl border-t-8 border-orange-700 text-center relative mt-8 md:mt-32 shadow-[0_-10px_20px_rgba(194,65,12,0.1)]">
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-14 h-14 bg-orange-700 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl">
                      <span className="text-xl font-black text-slate-100">3</span>
                   </div>
                   <h3 className="font-bold text-lg text-white mt-4 mb-1 truncate">{topTeams[2].team?.team_name || 'Ghost Team'}</h3>
                   <p className="text-slate-400 text-xs font-mono truncate mb-4">{topTeams[2].team?.project_title}</p>
                   <div className="bg-slate-900/80 rounded-lg p-2.5 inline-block border border-slate-700">
                      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-400 to-orange-800">
                         {topTeams[2].total_computed_score}
                      </span>
                   </div>
                 </div>
               </div>
            )}
          </div>

          {/* LIST OF REMAINING TEAMS */}
          {remainingTeams.length > 0 && (
            <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800">
               <table className="w-full text-left">
                  <thead className="bg-slate-900/80 border-b border-slate-800">
                     <tr>
                        <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest text-center w-20">Rank</th>
                        <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest">Team Designation</th>
                        <th className="p-5 text-sm font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Status</th>
                        <th className="p-5 text-sm font-bold text-brand-cyan uppercase tracking-widest text-right">Points</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                     {remainingTeams.map((row, index) => (
                        <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                           <td className="p-5 text-center font-mono text-slate-500 font-bold text-lg">
                              #{index + 4}
                           </td>
                           <td className="p-5">
                              <p className="font-bold text-white text-lg">{row.team?.team_name || 'Ghost Team'}</p>
                              <p className="text-sm text-slate-500 truncate max-w-xs">{row.team?.project_title}</p>
                           </td>
                           <td className="p-5 hidden md:table-cell">
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
                                {row.team?.status.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                              </span>
                           </td>
                           <td className="p-5 text-right">
                              <span className="font-black text-2xl text-brand-cyan">{row.total_computed_score}</span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
