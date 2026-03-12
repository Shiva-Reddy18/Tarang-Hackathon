import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Users, Database } from 'lucide-react';

interface TeamData {
  id: string;
  team_name: string;
  project_title: string;
  status: string;
  created_at: string;
  leader: { name: string; email: string };
  metrics: { score: number };
  submissions: any[];
}

export default function AdminDashboard() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, completed: 0 });

  const fetchTeamsData = async () => {
    setLoading(true);
    
    // Fetch teams with their leader
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id, team_name, project_title, status, created_at,
        users!teams_leader_id_fkey (name, email)
      `)
      .order('created_at', { ascending: false });

    if (teamsError || !teamsData) {
      console.error(teamsError);
      setLoading(false);
      return;
    }

    // Fetch scores
    const { data: scoresData } = await supabase.from('leaderboard').select('*');
    
    // Fetch submissions to get repo links/shas
    const { data: subsData } = await supabase.from('submissions').select('*');

    const formattedTeams = teamsData.map(team => {
      const scoreRow = scoresData?.find(s => s.team_id === team.id);
      const teamSubs = subsData?.filter(s => s.team_id === team.id) || [];
      return {
        ...team,
        leader: team.users || { name: 'Unknown', email: '' },
        metrics: { score: scoreRow?.score || 0 },
        submissions: teamSubs
      };
    });

    setTeams(formattedTeams as any);
    setStats({
      total: formattedTeams.length,
      completed: formattedTeams.filter(t => t.status === 'final_submitted').length
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchTeamsData();
    
    // Realtime subscription for team status updates
    const channel = supabase.channel('admin_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeamsData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        fetchTeamsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDownloadRepo = async (teamId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-repo', {
        body: { teamId }
      });
      if (error) throw error;
      if (data?.zipUrl) {
        window.open(data.zipUrl, '_blank');
      } else {
        alert('Repository not finalized or zip not found.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to trigger repo download.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
          <p className="text-slate-400">Live Mission Control Center</p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass-panel px-6 py-3 rounded-xl text-center border-brand-cyan/30">
            <span className="block text-2xl font-black text-brand-cyan">{stats.total}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Total Teams</span>
          </div>
          <div className="glass-panel px-6 py-3 rounded-xl text-center border-brand-saffron/30">
            <span className="block text-2xl font-black text-brand-saffron">{stats.completed}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wider">Completed</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl relative border-slate-700/50">
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold flex items-center text-slate-300">
            <Users className="w-5 h-5 mr-2 text-brand-cyan" /> Team Monitoring
          </h3>
          <button onClick={fetchTeamsData} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors text-white">
            Refresh Data
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
              <tr>
                <th className="px-6 py-4">Team</th>
                <th className="px-6 py-4">Leader</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-right">Actions / Repos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Loading telemetry data...
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No teams registered yet.
                  </td>
                </tr>
              ) : (
                teams.map(team => (
                  <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{team.team_name}</div>
                      <div className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{team.project_title || 'No Idea Yet'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300">{team.leader.name}</div>
                      <div className="text-xs text-slate-500">{team.leader.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                        team.status === 'final_submitted' ? 'bg-brand-saffron/10 text-brand-saffron border-brand-saffron/30' :
                        team.status === 'registered' ? 'bg-slate-800 text-slate-300 border-slate-600' :
                        'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30'
                      }`}>
                        {team.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-brand-cyan">
                      {team.metrics.score}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {team.status === 'final_submitted' && (
                          <button
                            onClick={() => handleDownloadRepo(team.id)}
                            className="flex items-center text-xs bg-brand-cyan text-slate-900 px-3 py-1.5 rounded hover:bg-brand-cyan/90 font-bold transition-colors shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                          >
                            <Download className="w-3 h-3 mr-1" /> Get Git Repo (.zip)
                          </button>
                        )}
                        <div className="text-xs text-slate-500 flex items-center">
                          <Database className="w-3 h-3 mr-1" /> {team.submissions.length} / 3 Obj.
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
