import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { Upload, GitCommit, CheckCircle, FileUp, Loader2 } from 'lucide-react';

const THEME = {
  title: "AI for Sustainable Futures",
  description: "Build an innovative solution leveraging Artificial Intelligence to address one of the UN Sustainable Development Goals (SDGs)."
};

const OBJECTIVES = [
  { id: 1, order_no: 1, title: 'Concept & Architecture', desc: 'Submit your idea, target SDG, and high-level architecture diagram. Include a brief README outlining the problem.' },
  { id: 2, order_no: 2, title: 'Core Implementation', desc: 'Build the MVP. Submit the main logic, API integrations, or core algorithm code.' },
  { id: 3, order_no: 3, title: 'Final Polish & Demo', desc: 'Submit the final working prototype, UI components, and a video link or detailed screenshots.' }
];

export default function ObjectivesFlow() {
  const { user, team, loading } = useAppStore();
  const [currentObjectiveIndex, setCurrentObjectiveIndex] = useState(0);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  const [description, setDescription] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalResult, setFinalResult] = useState<{ zipUrl?: string, remoteUrl?: string } | null>(null);

  useEffect(() => {
    if (!team) return;
    
    const fetchProgress = async () => {
      setFetchingData(true);
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('team_id', team.id)
        .order('objective_id', { ascending: true });

      if (!error && data) {
        setSubmissions(data);
        // Find highest completed objective to set current index
        const completedIds = data.map(s => s.objective_id);
        const nextIndex = OBJECTIVES.findIndex(obj => !completedIds.includes(obj.id));
        setCurrentObjectiveIndex(nextIndex === -1 ? OBJECTIVES.length : nextIndex);
      }
      setFetchingData(false);
    };

    fetchProgress();
  }, [team]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team || !user || currentObjectiveIndex >= OBJECTIVES.length) return;
    
    setSubmitting(true);
    const objective = OBJECTIVES[currentObjectiveIndex];
    
    try {
      let storagePath = null;
      if (file) {
        // Enforce basic client limits here (e.g. 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File size exceeds 10MB limit.');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${team.id}/${objective.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('team-submissions')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        storagePath = data.path;
      }

      const newSubmission = {
        team_id: team.id,
        objective_id: objective.id,
        submitter_id: user.id,
        description: description,
        repo_link: repoLink || null,
        storage_path: storagePath
      };

      const { data, error } = await supabase.from('submissions').insert(newSubmission).select().single();
      if (error) throw error;
      
      // Update local state to advance to next objective
      setSubmissions(prev => [...prev, data]);
      setCurrentObjectiveIndex(prev => prev + 1);
      
      // Reset form
      setDescription('');
      setRepoLink('');
      setFile(null);
      
      // Update team status in background
      let nextStatus = 'registered';
      if (objective.order_no === 1) nextStatus = 'idea_submitted';
      if (objective.order_no === 2) nextStatus = 'dev_started';
      if (objective.order_no === 3) nextStatus = 'prototype_done';
      
      await supabase.from('teams').update({ status: nextStatus }).eq('id', team.id);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    if (!team) return;
    setFinalizing(true);
    
    try {
      // Update final status
      await supabase.from('teams').update({ status: 'final_submitted' }).eq('id', team.id);
      
      // Call edge function to create repo
      const { data, error } = await supabase.functions.invoke('create-repo', {
        body: { teamId: team.id }
      });
      
      if (error) throw error;
      
      if (data) {
        setFinalResult(data);
      }
      
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Finalization process failed.');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading || fetchingData) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-cyan" /></div>;
  }

  const isCompleted = currentObjectiveIndex >= OBJECTIVES.length;
  const currentObjective = !isCompleted ? OBJECTIVES[currentObjectiveIndex] : null;

  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-5xl mx-auto w-full">
      {/* Theme Header */}
      <div className="glass-panel p-6 rounded-2xl w-full mb-8 border-t-4 border-t-brand-saffron relative overflow-hidden">
        <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase mb-2">Hackathon Theme</h2>
        <h3 className="text-3xl font-bold text-white mb-2">{THEME.title}</h3>
        <p className="text-slate-300">{THEME.description}</p>
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-brand-cyan font-bold mb-1">
            <span>Progress</span>
            <span>{Math.round((submissions.length / OBJECTIVES.length) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-brand-cyan h-2 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
              style={{ width: `${(submissions.length / OBJECTIVES.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          
          {!isCompleted && currentObjective ? (
            <div className="glass-panel p-8 rounded-2xl border border-brand-cyan/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="text-8xl font-black">0{currentObjective.order_no}</span>
              </div>
              
              <h4 className="text-2xl font-bold text-brand-cyan mb-2">Objective {currentObjective.order_no}: {currentObjective.title}</h4>
              <p className="text-slate-300 mb-8">{currentObjective.desc}</p>
              
              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Work Description / Summary</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-saffron focus:ring-1 focus:ring-brand-saffron transition-colors resize-none"
                    placeholder="Describe what you accomplished in this objective..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center">
                    <FileUp className="w-4 h-4 mr-2"/> Code File / Archive (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-cyan/10 file:text-brand-cyan hover:file:bg-brand-cyan/20 cursor-pointer"
                  />
                  <p className="text-xs text-slate-500 mt-1">Accepts .zip, .tsx, .js, .py, etc. Max 10MB.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center">
                    <GitCommit className="w-4 h-4 mr-2"/> External Repo Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={repoLink}
                    onChange={(e) => setRepoLink(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-saffron focus:ring-1 focus:ring-brand-saffron transition-colors"
                    placeholder="https://github.com/your-username/repo"
                  />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !description.trim()}
                    className="bg-brand-saffron text-slate-900 font-bold rounded-full px-8 py-3 flex items-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                    Submit Objective {currentObjective.order_no}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-2xl border-2 border-brand-cyan text-center">
              <div className="bg-brand-cyan/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-brand-cyan" />
              </div>
              <h4 className="text-3xl font-bold text-white mb-4">All Objectives Completed!</h4>
              <p className="text-slate-300 mb-8 max-w-md mx-auto">
                You have successfully completed all objectives for Tarang2k26! You can now finalize your submission to trigger the git repository creation.
              </p>
              
              {!finalResult ? (
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="bg-brand-cyan text-slate-900 font-bold rounded-full px-10 py-4 text-lg flex items-center mx-auto hover:scale-105 transition-transform shadow-[0_0_20px_rgba(6,182,212,0.6)] disabled:opacity-70 disabled:hover:scale-100"
                >
                  {finalizing ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <GitCommit className="w-6 h-6 mr-2" />}
                  {finalizing ? 'Generating Repository...' : 'Finalize & Generate Repo'}
                </button>
              ) : (
                <div className="bg-slate-900/80 border border-brand-cyan/50 p-6 rounded-xl text-left">
                  <h5 className="text-brand-cyan font-bold mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" /> Repository Generated Successfully
                  </h5>
                  {finalResult.zipUrl && (
                    <a href={finalResult.zipUrl} target="_blank" rel="noreferrer" className="block p-3 bg-brand-cyan/10 rounded-lg text-brand-cyan hover:bg-brand-cyan/20 mb-3 border border-brand-cyan/20 truncate">
                      ⬇️ Download Repo Archive (.zip)
                    </a>
                  )}
                  {finalResult.remoteUrl && (
                    <a href={finalResult.remoteUrl} target="_blank" rel="noreferrer" className="block p-3 bg-slate-800 rounded-lg text-white hover:bg-slate-700 border border-slate-600 truncate">
                      🔗 View on GitHub (Remote)
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Sidebar / Objective History */}
        <div className="space-y-4">
          <h4 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Mission Log</h4>
          
          {OBJECTIVES.map((obj) => {
            const submission = submissions.find(s => s.objective_id === obj.id);
            const isCurrent = currentObjective?.id === obj.id;
            const isDone = !!submission;
            
            return (
              <div 
                key={obj.id} 
                className={`p-4 rounded-xl border transition-colors ${
                  isDone 
                    ? 'bg-brand-cyan/5 border-brand-cyan/30' 
                    : isCurrent 
                      ? 'bg-slate-800/80 border-brand-saffron/50 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                      : 'bg-slate-900/50 border-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className={`font-bold ${isDone ? 'text-brand-cyan' : isCurrent ? 'text-brand-saffron' : 'text-slate-400'}`}>
                    Objective {obj.order_no}
                  </h5>
                  {isDone && <CheckCircle className="w-4 h-4 text-brand-cyan" />}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{obj.title}</p>
                {isDone && submission && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-500">
                    <div className="truncate mb-1 text-slate-300">"{submission.description}"</div>
                    {submission.storage_path && <div className="text-brand-cyan/70">📁 File Attached</div>}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-8">
            <h4 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Take a Break?</h4>
            <a href="/arena/game" className="block p-4 rounded-xl glass-panel border border-brand-saffron/30 hover:border-brand-saffron transition-colors group cursor-pointer">
              <h5 className="font-bold text-brand-saffron mb-1 group-hover:underline">Play Bug Hunter</h5>
              <p className="text-xs text-slate-400">Earn points for your team while you rest!</p>
            </a>
          </div>
        </div>
        
      </div>
    </div>
  );
}
