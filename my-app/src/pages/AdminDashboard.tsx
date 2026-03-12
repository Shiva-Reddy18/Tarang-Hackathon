import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { 
  Users, Target, Settings, Activity, 
  Loader2, StopCircle, PlayCircle, 
  AlertTriangle, Shield, ThumbsUp, Database, 
  FileUp, Search, ShieldCheck, Mail, GitCommit,
  CheckCircle2, XCircle
} from 'lucide-react';

// Admin / Judge Types
type Team = {
  id: string;
  team_name: string;
  leader_id: string;
  members: any[];
  project_title: string | null;
  status: string;
  created_at: string;
};

type Submission = {
  id: string;
  team_id: string;
  objective_id: number;
  description: string;
  storage_path: string;
  repo_link: string;
  commit_sha: string;
  created_at: string;
};

type JudgingScore = {
  id: string;
  team_id: string;
  judge_id: string;
  score_innovation: number;
  score_technical: number;
  score_design: number;
  score_presentation: number;
  total_score: number;
  feedback: string;
};

type Objective = {
  id: number;
  title: string;
  description: string;
  order_no: number;
};

export default function AdminDashboard() {
  const { user, config, fetchConfig } = useAppStore();
  
  const isJudge = user?.role === 'judge';
  const isAdmin = user?.role === 'admin';

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'teams' | 'submissions' | 'objectives' | 'judging'>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: 'success' });

  // Data State
  const [teams, setTeams] = useState<Team[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [scores, setScores] = useState<JudgingScore[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Admin Config State
  const [announcement, setAnnouncement] = useState('');

  // Judging Form State
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [jScore, setJScore] = useState({ inn: 0, tech: 0, des: 0, pres: 0, fb: '' });

  // Objective Form State
  const [newObj, setNewObj] = useState({ id: 0, title: '', desc: '', order: 0 });

  useEffect(() => {
    fetchData();
    
    // Set default tab for judges
    if (isJudge && activeTab === 'overview') {
      setActiveTab('submissions');
    }
  }, [user, isJudge]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeams(),
        fetchSubmissions(),
        fetchScores(),
        fetchObjectives(),
        fetchConfig() // from store
      ]);
      if (config) setAnnouncement(config.current_announcement || '');
    } catch (err) {
      console.error(err);
      showMessage('Failed to sync full platform state.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    if (data) setTeams(data as Team[]);
  };

  const fetchSubmissions = async () => {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (data) setSubmissions(data as Submission[]);
  };

  const fetchScores = async () => {
    let query = supabase.from('judging_scores').select('*');
    if (isJudge) query = query.eq('judge_id', user?.id); // Judges only need to see their own scores to edit
    const { data } = await query;
    if (data) setScores(data as JudgingScore[]);
  };

  const fetchObjectives = async () => {
    const { data } = await supabase.from('objectives').select('*').order('order_no', { ascending: true });
    if (data) setObjectives(data as Objective[]);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: 'success' }), 5000);
  };

  // --- ADMIN ACTIONS ---
  
  const toggleHackathonStatus = async () => {
    if (!isAdmin || !config) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('admin_config').update({ is_active: !config.is_active }).eq('id', 1);
      if (error) throw error;
      await fetchConfig();
      showMessage(`Hackathon is now ${!config.is_active ? 'ACTIVE' : 'PAUSED'}`, 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const updateAnnouncement = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('admin_config').update({ current_announcement: announcement }).eq('id', 1);
      if (error) throw error;
      await fetchConfig();
      showMessage('Announcement broadcasted globally!', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisqualify = async (teamId: string, currentStatus: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to ${currentStatus === 'disqualified' ? 'reinstate' : 'disqualify'} this team?`)) return;
    
    setActionLoading(true);
    try {
      const newStatus = currentStatus === 'disqualified' ? 'registered' : 'disqualified';
      const { error } = await supabase.from('teams').update({ status: newStatus }).eq('id', teamId);
      if (error) throw error;
      await fetchTeams();
      showMessage('Team status updated successfully.', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('objectives').insert({
        id: newObj.id,
        title: newObj.title,
        description: newObj.desc,
        order_no: newObj.order
      });
      if (error) throw error;
      
      await fetchObjectives();
      setNewObj({ id: 0, title: '', desc: '', order: 0 });
      showMessage('Objective inserted to the database.', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteObjective = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('WARNING: Deleting an objective will wipe out all corresponding team submissions via cascade. Continue?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('objectives').delete().eq('id', id);
      if (error) throw error;
      await fetchObjectives();
      await fetchSubmissions();
      showMessage('Objective and related submissions deleted.', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- JUDGE ACTIONS ---
  
  const submitJudgingScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || (!isJudge && !isAdmin)) return;
    setActionLoading(true);

    try {
      // Upsert logic for judging
      const existingScore = scores.find(s => s.team_id === selectedTeam && s.judge_id === user?.id);
      
      const payload = {
        team_id: selectedTeam,
        judge_id: user?.id,
        score_innovation: Number(jScore.inn),
        score_technical: Number(jScore.tech),
        score_design: Number(jScore.des),
        score_presentation: Number(jScore.pres),
        feedback: jScore.fb,
        updated_at: new Date().toISOString()
      };

      if (existingScore) {
        const { error } = await supabase.from('judging_scores').update(payload).eq('id', existingScore.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('judging_scores').insert(payload as any);
        if (error) throw error;
      }

      // Update leaderboard judge aggregate
      const { data: allJudgeScores } = await supabase.from('judging_scores').select('total_score').eq('team_id', selectedTeam);
      const newTotal = (allJudgeScores || []).reduce((acc, curr) => acc + curr.total_score, 0);

      // Check if leaderboard row exists, update it or insert if missing
      const { data: lbCheck } = await supabase.from('leaderboard').select('id').eq('team_id', selectedTeam).maybeSingle();
      if (lbCheck) {
         await supabase.from('leaderboard').update({ judge_score: newTotal, updated_at: new Date().toISOString() }).eq('team_id', selectedTeam);
      } else {
         await supabase.from('leaderboard').insert({ team_id: selectedTeam, judge_score: newTotal });
      }

      await fetchScores();
      showMessage('Score submitted to the blockchain!', 'success');
      setSelectedTeam(null);
      setJScore({ inn: 0, tech: 0, des: 0, pres: 0, fb: '' });

    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openJudgingForm = (teamId: string) => {
    const existingScore = scores.find(s => s.team_id === teamId && s.judge_id === user?.id);
    setSelectedTeam(teamId);
    if (existingScore) {
      setJScore({
        inn: existingScore.score_innovation,
        tech: existingScore.score_technical,
        des: existingScore.score_design,
        pres: existingScore.score_presentation,
        fb: existingScore.feedback
      });
    } else {
      setJScore({ inn: 0, tech: 0, des: 0, pres: 0, fb: '' });
    }
    setActiveTab('judging');
  };

  // --- UTILS ---

  const viewTeamSubmissions = (teamName: string) => {
    setSearchTerm(teamName);
    setActiveTab('submissions');
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-cyan animate-spin" />
          <p className="text-brand-cyan font-bold tracking-widest uppercase">Initializing Vault...</p>
        </div>
      </div>
    );
  }

  const filteredTeams = teams.filter(t => 
    t.team_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.project_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-3">
            <ShieldCheck className="w-10 h-10 text-brand-saffron" />
            {isAdmin ? 'Admin Console' : 'Judging Portal'}
          </h1>
          <p className="text-slate-400 mt-2 font-mono text-sm">
            {isAdmin ? 'System Override and Data Management Active' : 'Evaluate and Score Team Submissions'}
          </p>
        </div>

        {/* Status Badge */}
        {isAdmin && config && (
          <div className={`px-4 py-2 rounded-full font-bold border flex items-center gap-2 ${config.is_active ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
            <Activity className="w-5 h-5 animate-pulse" />
            VIRTUAL ARENA: {config.is_active ? 'ONLINE' : 'OFFLINE'}
          </div>
        )}
      </div>

      {message.text && (
        <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-fade-in ${
          message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium text-sm">{message.text}</p>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
        {isAdmin && (
          <button onClick={() => setActiveTab('overview')} className={`px-6 py-2.5 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'overview' ? 'bg-brand-cyan text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Activity className="w-4 h-4" /> Global Overview
          </button>
        )}
        <button onClick={() => setActiveTab('teams')} className={`px-6 py-2.5 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'teams' ? 'bg-brand-cyan text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          <Users className="w-4 h-4" /> Team Roster {isAdmin && `(${teams.length})`}
        </button>
        <button onClick={() => setActiveTab('submissions')} className={`px-6 py-2.5 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'submissions' ? 'bg-brand-cyan text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
          <Database className="w-4 h-4" /> Submissions {isAdmin && `(${submissions.length})`}
        </button>
        {(isAdmin || isJudge) && (
          <button onClick={() => setActiveTab('judging')} className={`px-6 py-2.5 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'judging' ? 'bg-brand-cyan text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <ThumbsUp className="w-4 h-4" /> Judging HQ
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setActiveTab('objectives')} className={`px-6 py-2.5 rounded-t-lg font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'objectives' ? 'bg-brand-cyan text-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Target className="w-4 h-4" /> Manage Objectives
          </button>
        )}
      </div>

      <div className="min-h-[500px]">
        {/* ======================================= */}
        {/* TAB: OVERVIEW (ADMIN ONLY)              */}
        {/* ======================================= */}
        {activeTab === 'overview' && isAdmin && (
          <div className="space-y-8 animate-fade-in">
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-brand-cyan">
                 <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total Participants</p>
                 <h2 className="text-4xl font-black text-white">{teams.reduce((acc, t) => acc + (t.members.length || 0), 0)}</h2>
              </div>
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-brand-saffron">
                 <p className="text-slate-400 text-xs font-bold uppercase mb-2">Registered Teams</p>
                 <h2 className="text-4xl font-black text-white">{teams.length}</h2>
              </div>
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-green-400">
                 <p className="text-slate-400 text-xs font-bold uppercase mb-2">Total Artifacts</p>
                 <h2 className="text-4xl font-black text-white">{submissions.length}</h2>
              </div>
              <div className="glass-panel p-6 rounded-2xl border-l-4 border-purple-500">
                 <p className="text-slate-400 text-xs font-bold uppercase mb-2">Judging Completed</p>
                 <h2 className="text-4xl font-black text-white">{scores.length} <span className="text-sm font-normal text-slate-500">evals</span></h2>
              </div>
            </div>

            {/* Hackathon Control Center */}
            <div className="glass-panel p-8 rounded-2xl border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                <Settings className="w-6 h-6 text-brand-cyan" /> Core Engine Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                  <h4 className="text-slate-300 font-bold mb-4">Arena Status</h4>
                  <p className="text-sm text-slate-400 mb-6">
                    Toggle the hackathon active status. When paused, participants cannot see objectives or submit files.
                  </p>
                  <button 
                    onClick={toggleHackathonStatus}
                    disabled={actionLoading}
                    className={`w-full py-4 rounded-lg font-bold flex items-center justify-center gap-3 transition-colors ${
                      config?.is_active 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                        : 'bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500/20'
                    }`}
                  >
                    {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : config?.is_active ? <StopCircle className="w-5 h-5"/> : <PlayCircle className="w-5 h-5"/>}
                    {config?.is_active ? 'EMERGENCY PAUSE ENGINE' : 'ACTIVATE VIRTUAL ARENA'}
                  </button>
                </div>

                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 flex flex-col">
                  <h4 className="text-slate-300 font-bold mb-4">Global Broadcast System</h4>
                  <textarea 
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-saffron"
                    placeholder="Broadcast an important message to all participant dashboards..."
                  />
                  <button 
                    onClick={updateAnnouncement}
                    disabled={actionLoading || announcement === config?.current_announcement}
                    className="mt-4 w-full bg-brand-saffron text-slate-900 py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50"
                  >
                    <Mail className="w-5 h-5" /> Transmission Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB: TEAMS                               */}
        {/* ======================================= */}
        {activeTab === 'teams' && (
          <div className="animate-fade-in space-y-6">
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search teams by name or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>

            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <th className="p-4">Team Designation</th>
                      <th className="p-4">Project Architecture</th>
                      <th className="p-4">Status Node</th>
                      <th className="p-4">Members</th>
                      {isAdmin && <th className="p-4 text-right">Overrides</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTeams.map(team => (
                      <tr key={team.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white text-lg">{team.team_name}</p>
                          <p className="text-xs text-slate-500 font-mono mt-1">ID: {team.id.substring(0, 8)}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-brand-saffron font-medium">{team.project_title || 'Classified Data'}</p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
                            team.status === 'disqualified' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            team.status === 'final_submitted' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20'
                          }`}>
                            {team.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex -space-x-2">
                            {team.members.map((m: any, i: number) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white shadow-sm" title={m.email}>
                                {m.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="p-4 text-right space-x-2">
                             <button
                               onClick={() => viewTeamSubmissions(team.team_name)}
                               className="p-2 rounded bg-slate-800 text-slate-300 hover:text-brand-cyan transition-colors"
                               title="View Team Submissions"
                             >
                               <Database className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => openJudgingForm(team.id)}
                               className="p-2 rounded bg-slate-800 text-slate-300 hover:text-brand-saffron transition-colors"
                               title="Grade/Score this Team"
                             >
                               <ThumbsUp className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => handleDisqualify(team.id, team.status)}
                               className={`p-2 rounded ${team.status === 'disqualified' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}
                               title={team.status === 'disqualified' ? "Reinstate Team" : "Disqualify Team"}
                             >
                               {team.status === 'disqualified' ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                             </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredTeams.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500 italic">No teams localized in the DB matching query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB: SUBMISSIONS & REVIEW               */}
        {/* ======================================= */}
        {activeTab === 'submissions' && (
          <div className="animate-fade-in space-y-6">
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search submissions by team or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-brand-cyan"
              />
            </div>
            <div className="glass-panel rounded-2xl border border-slate-800 p-6 shadow-2xl">
               <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-4">Artifact Repository Core</h3>
               
               <div className="space-y-4">
                 {submissions.filter(sub => {
                    const teamObj = teams.find(t => t.id === sub.team_id);
                    if (!searchTerm) return true;
                    return teamObj?.team_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           teamObj?.project_title?.toLowerCase().includes(searchTerm.toLowerCase());
                 }).map(sub => {
                   const teamObj = teams.find(t => t.id === sub.team_id);
                   const objObj = objectives.find(o => o.id === sub.objective_id);
                   
                   return (
                     <div key={sub.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-brand-cyan/50 transition-colors">
                       <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                         <div>
                           <h4 className="text-white font-bold text-lg">{teamObj?.team_name || 'Unknown Team'} <span className="text-slate-500 font-normal text-sm ml-2">Objective #{objObj?.order_no}</span></h4>
                           <h5 className="text-brand-saffron text-sm mt-1">{objObj?.title}</h5>
                         </div>
                         <div className="flex items-center gap-3">
                           <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                             {new Date(sub.created_at).toLocaleString()}
                           </span>
                           {(isAdmin || isJudge) && (
                              <button onClick={() => openJudgingForm(sub.team_id)} className="bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 border border-brand-cyan/20 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                                <ThumbsUp className="w-4 h-4" /> Grade Team
                              </button>
                           )}
                         </div>
                       </div>
                       
                       <p className="text-slate-300 text-sm bg-slate-950 p-4 rounded-lg border border-slate-800 mb-4 whitespace-pre-wrap leading-relaxed">
                         {sub.description || <span className="italic text-slate-600">No implementation notes provided.</span>}
                       </p>

                       <div className="flex flex-wrap gap-4 border-t border-slate-800 pt-4 mt-4">
                         {sub.repo_link && (
                           <a href={sub.repo_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-800 px-4 py-2 rounded-lg transition-colors">
                             <GitCommit className="w-4 h-4 text-brand-saffron" /> Repository Hook Active
                           </a>
                         )}
                         {sub.storage_path && (
                            <button
                               onClick={async () => {
                                 const { data } = await supabase.storage.from('team-submissions').createSignedUrl(sub.storage_path!, 3600);
                                 if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                               }}
                               className="flex items-center gap-2 text-sm text-brand-cyan hover:text-white bg-brand-cyan/10 px-4 py-2 rounded-lg transition-colors border border-brand-cyan/30"
                            >
                               <FileUp className="w-4 h-4" /> View Associated Artifact
                            </button>
                         )}
                       </div>
                     </div>
                   );
                 })}
                 
                 {submissions.length === 0 && (
                   <div className="text-center py-16 text-slate-500 font-mono">
                     <Database className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     No artifacts have been uploaded to the nexus yet.
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB: JUDGING HQ                         */}
        {/* ======================================= */}
        {activeTab === 'judging' && (isAdmin || isJudge) && (
          <div className="animate-fade-in space-y-8">
            <div className="glass-panel p-8 rounded-2xl border-t-4 border-brand-saffron">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Target className="w-6 h-6 text-brand-saffron" /> Evaluation Protocol
              </h2>
              <p className="text-slate-400 mb-8">
                Select a team and issue scores. Scores auto-calculate base points + judge multipliers. Maximum points per category is 25 (Total: 100).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Score Input Form */}
                <form onSubmit={submitJudgingScore} className="bg-slate-900/60 p-6 rounded-xl border border-slate-700">
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Select Target Team</label>
                    <select
                      required
                      value={selectedTeam || ''}
                      onChange={(e) => {
                        setSelectedTeam(e.target.value);
                        // Auto-fill existing score if available
                        const existing = scores.find(s => s.team_id === e.target.value && s.judge_id === user?.id);
                        if (existing) {
                          setJScore({ inn: existing.score_innovation, tech: existing.score_technical, des: existing.score_design, pres: existing.score_presentation, fb: existing.feedback });
                        } else {
                          setJScore({ inn: 0, tech: 0, des: 0, pres: 0, fb: '' });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-brand-saffron font-bold"
                    >
                      <option value="" disabled>--- SELECT DISCOVERY TEAM ---</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.team_name} - {t.project_title || 'Untitled'}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-brand-cyan mb-1">Innovation (0-25)</label>
                      <input type="number" min="0" max="25" required value={jScore.inn} onChange={e => setJScore({...jScore, inn: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-cyan mb-1">Technical Stack (0-25)</label>
                      <input type="number" min="0" max="25" required value={jScore.tech} onChange={e => setJScore({...jScore, tech: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-saffron mb-1">UI / Design (0-25)</label>
                      <input type="number" min="0" max="25" required value={jScore.des} onChange={e => setJScore({...jScore, des: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 font-mono" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-brand-saffron mb-1">Presentation (0-25)</label>
                      <input type="number" min="0" max="25" required value={jScore.pres} onChange={e => setJScore({...jScore, pres: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-4 py-2 font-mono" />
                    </div>
                  </div>

                  <div className="mb-6 border-t border-slate-800 pt-6">
                     <div className="flex justify-between items-center bg-slate-950 p-4 rounded-lg border border-slate-700">
                        <span className="font-bold text-slate-400 uppercase">Calculated Total</span>
                        <span className="text-3xl font-black text-white">{jScore.inn + jScore.tech + jScore.des + jScore.pres} <span className="text-sm font-normal text-slate-500">/ 100</span></span>
                     </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wide">Judge Feedback & Notes</label>
                    <textarea 
                      required value={jScore.fb} onChange={e => setJScore({...jScore, fb: e.target.value})} 
                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-4 focus:outline-none focus:border-brand-saffron min-h-[100px]"
                      placeholder="Explain your reasoning for the scores given to this team's repository."
                    />
                  </div>

                  <button type="submit" disabled={actionLoading || !selectedTeam} className="w-full font-bold bg-brand-saffron text-slate-900 py-3 rounded-lg flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-50">
                    {actionLoading ? <Loader2 className="animate-spin w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>} 
                    Commit Final Evaluation
                  </button>
                </form>

                {/* Score History preview */}
                <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800 h-fit max-h-[600px] overflow-y-auto">
                   <h3 className="font-bold text-slate-300 uppercase tracking-widest mb-6 border-b border-slate-800 pb-2">Your Submitted Evals Log</h3>
                   
                   <div className="space-y-4">
                     {scores.map(s => {
                       const t = teams.find(x => x.id === s.team_id);
                       return (
                         <div key={s.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 border-l-2 border-l-brand-cyan group hover:border-brand-cyan/50 cursor-pointer" onClick={() => openJudgingForm(s.team_id)}>
                           <div className="flex justify-between items-start mb-2">
                             <h4 className="font-bold text-white group-hover:text-brand-cyan">{t?.team_name || 'Unknown'}</h4>
                             <span className="text-xl font-black text-white bg-slate-900 px-3 py-1 rounded shadow-inner">{s.total_score}</span>
                           </div>
                           <p className="text-xs text-slate-500 line-clamp-2 italic">"{s.feedback}"</p>
                         </div>
                       )
                     })}
                     {scores.length === 0 && (
                       <p className="text-slate-500 text-sm text-center italic mt-10">No scores written to ledger.</p>
                     )}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB: OBJECTIVES MANAGEMENT (ADMIN ONLY) */}
        {/* ======================================= */}
        {activeTab === 'objectives' && isAdmin && (
          <div className="animate-fade-in space-y-8">
            <div className="glass-panel p-8 rounded-2xl border-l-4 border-brand-cyan">
               <h2 className="text-2xl font-bold text-white mb-6">Database Schema: Objectives Array</h2>

               <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 mb-8">
                 <h3 className="text-brand-cyan font-bold mb-4 uppercase text-xs">Register New Node</h3>
                 <form onSubmit={handleAddObjective} className="flex flex-wrap md:flex-nowrap gap-4 items-end">
                   <div className="w-20">
                     <label className="block text-xs font-bold text-slate-400 mb-1">ID</label>
                     <input type="number" required value={newObj.id} onChange={e => setNewObj({...newObj, id: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:border-brand-cyan outline-none" />
                   </div>
                   <div className="w-20">
                     <label className="block text-xs font-bold text-slate-400 mb-1">Order Index</label>
                     <input type="number" required value={newObj.order} onChange={e => setNewObj({...newObj, order: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:border-brand-cyan outline-none" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-xs font-bold text-slate-400 mb-1">Objective Title String</label>
                     <input type="text" required value={newObj.title} onChange={e => setNewObj({...newObj, title: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:border-brand-cyan outline-none" />
                   </div>
                   <div className="flex-1">
                     <label className="block text-xs font-bold text-slate-400 mb-1">Detailed Description Buffer</label>
                     <input type="text" required value={newObj.desc} onChange={e => setNewObj({...newObj, desc: e.target.value})} className="w-full bg-slate-950 border border-slate-700 text-white px-3 py-2 rounded focus:border-brand-cyan outline-none" />
                   </div>
                   <button type="submit" disabled={actionLoading} className="bg-brand-cyan text-slate-900 font-bold px-6 py-2 rounded hover:bg-brand-cyan/90">INIT</button>
                 </form>
               </div>

               <div className="space-y-3">
                 {objectives.map(obj => (
                   <div key={obj.id} className="bg-slate-950 p-4 rounded-xl border border-slate-700 flex justify-between items-center group">
                     <div className="flex items-center gap-6">
                       <span className="text-2xl font-black text-slate-700">{obj.order_no}</span>
                       <div>
                         <h4 className="text-white font-bold">{obj.title} <span className="text-slate-500 font-mono text-xs ml-2">PK:{obj.id}</span></h4>
                         <p className="text-sm text-slate-400 mt-1">{obj.description}</p>
                       </div>
                     </div>
                     <button onClick={() => handleDeleteObjective(obj.id)} disabled={actionLoading} className="text-slate-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all">
                       <XCircle className="w-6 h-6" />
                     </button>
                   </div>
                 ))}
                 {objectives.length === 0 && (
                   <p className="text-slate-500 italic text-center p-8 border border-dashed border-slate-700 rounded-xl">Objectives array is currently empty.</p>
                 )}
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
