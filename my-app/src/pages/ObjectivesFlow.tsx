import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { 
  Upload, GitCommit, CheckCircle, FileUp, Loader2, 
  AlertTriangle, ShieldAlert, BookOpen, Target, 
  Trophy, ChevronRight, CheckCircle2,
  ExternalLink, Github
} from 'lucide-react';
type ObjectiveInfo = {
  id: number;
  title: string;
  description: string;
  order_no: number;
};

type Submission = {
  id: string;
  objective_id: number;
  description: string | null;
  storage_path: string | null;
  repo_link: string | null;
  commit_sha: string | null;
};

export default function ObjectivesFlow() {
  const { user, team, config } = useAppStore();
  const [objectives, setObjectives] = useState<ObjectiveInfo[]>([]);
  const [submissions, setSubmissions] = useState<Record<number, Submission>>({});
  const [loading, setLoading] = useState(true);
  
  // Dashboard Navigation State
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  
  // Objective Form State
  const [activeObjective, setActiveObjective] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Status / Errors
  const [errorDetails, setErrorDetails] = useState('');
  const [successDetails, setSuccessDetails] = useState('');

  useEffect(() => {
    // Check local storage for rules acceptance so they don't have to click it every refresh within the same session
    const accepted = localStorage.getItem(`tarang_rules_${user?.id}`);
    if (accepted === 'true') {
      setHasAcceptedRules(true);
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!team) return;
      
      try {
        // Fetch Objectives
        const { data: objData, error: objError } = await supabase
          .from('objectives')
          .select('*')
          .order('order_no', { ascending: true });
          
        if (objError) throw objError;
        setObjectives(objData as ObjectiveInfo[]);

        // Fetch Submissions
        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .select('*')
          .eq('team_id', team.id);
          
        if (subError) throw subError;

        const subMap: Record<number, Submission> = {};
        subData?.forEach(s => {
          subMap[s.objective_id] = s as Submission;
        });
        setSubmissions(subMap);

        // Determine active objective (first uncompleted)
        if (objData) {
          const nextObj = objData.find(o => !subMap[o.id]);
          if (nextObj) setActiveObjective(nextObj.id);
          else setActiveObjective(null); // All complete
        }

      } catch (err) {
        console.error('Failed to load objectives:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [team]);

  const handleAcceptRules = () => {
    localStorage.setItem(`tarang_rules_${user?.id}`, 'true');
    setHasAcceptedRules(true);
  };

  const handleSubmission = async (e: React.FormEvent, objectiveId: number) => {
    e.preventDefault();
    if (!team || !user) return;
    
    setSubmitting(true);
    setErrorDetails('');
    setSuccessDetails('');
    setUploadProgress(0);

    try {
      let storagePath = null;
      let commitSha = null;

      // 1. Upload File (if provided)
      if (file) {
        if (file.size > 10 * 1024 * 1024) throw new Error("File must be less than 10MB");
        const fileExt = file.name.split('.').pop();
        const fileName = `${team.id}/${objectiveId}_${Date.now()}.${fileExt}`;
        
        setUploadProgress(30);

        const { error: uploadError } = await supabase.storage
          .from('team-submissions')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;
        storagePath = fileName;
        setUploadProgress(60);
      }

      // 2. Insert Submission Record
      const submissionData = {
        team_id: team.id,
        objective_id: objectiveId,
        submitter_id: user.id,
        description: description || null,
        storage_path: storagePath,
        repo_link: repoLink || null,
        commit_sha: commitSha
      };

      const { data: insertedSub, error: dbError } = await supabase
        .from('submissions')
        .insert(submissionData)
        .select()
        .single();

      if (dbError) throw dbError;
      setUploadProgress(80);

      // 3. Update Team Status based on order
      const obj = objectives.find(o => o.id === objectiveId);
      if (obj) {
        let newStatus = team.status;
        if (obj.order_no === 1) newStatus = 'idea_submitted';
        if (obj.order_no === 2) newStatus = 'prototype_done';
        if (obj.order_no === 3) newStatus = 'final_submitted';

        if (newStatus !== team.status) {
          const { error: updateError } = await supabase
            .from('teams')
            .update({ status: newStatus })
            .eq('id', team.id);
            
          if (updateError) console.error("Could not update team status", updateError);
        }
      }

      setUploadProgress(100);
      setSuccessDetails("Objective successfully completed and synchronized!");

      // Update local state first
      const updatedSubmissions = { ...submissions, [objectiveId]: insertedSub as Submission };
      setSubmissions(updatedSubmissions);
      
      // Auto-advance to next incomplete objective
      setTimeout(() => {
        const nextObj = objectives.find(o => !updatedSubmissions[o.id]);
        if (nextObj) {
           setActiveObjective(nextObj.id);
        } else {
           setActiveObjective(null); // Finished everything
        }
      }, 2000);
      
      // Reset fields
      setDescription('');
      setRepoLink('');
      setFile(null);

    } catch (err: any) {
       console.error(err);
       setErrorDetails(err.message || "Failed to submit. Please try again or contact support.");
    } finally {
       setSubmitting(false);
       setTimeout(() => setUploadProgress(0), 3000);
    }
  };


  // -----------------------------------------------------
  // VIEW: RULES & GUIDELINES (SHOWN FIRST)
  // -----------------------------------------------------
  if (!hasAcceptedRules) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="glass-panel p-8 md:p-12 rounded-2xl border-t-4 border-t-brand-saffron shadow-2xl relative overflow-hidden">
          
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Welcome to <span className="text-brand-cyan">Tarang</span><span className="text-brand-saffron">2k26</span>
            </h1>
            <p className="text-xl text-slate-300">Please review the hackathon protocols before entering the dashboard.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Rules */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 hover:border-brand-cyan/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="w-8 h-8 text-brand-saffron" />
                <h2 className="text-2xl font-bold text-white">Hackathon Rules</h2>
              </div>
              <ul className="space-y-3 text-slate-300 text-sm">
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 shrink-0"/> All code must be written during the hackathon period.</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 shrink-0"/> Plagiarism will result in immediate disqualification.</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 shrink-0"/> Teams must contain between 2 to 4 members.</li>
                <li className="flex gap-2 items-start"><CheckCircle2 className="w-4 h-4 text-brand-cyan mt-0.5 shrink-0"/> Submissions must be entirely functional to receive full technical scores.</li>
              </ul>
            </div>

            {/* Code of Conduct */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 hover:border-brand-cyan/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-8 h-8 text-brand-cyan" />
                <h2 className="text-2xl font-bold text-white">Code of Conduct</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                Tarang2k26 is dedicated to providing a safe, strictly professional, and welcoming environment for everyone. We strictly prohibit harassment of hackathon participants in any form.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                Respect judges, mentors, and fellow participants. Any violation of these guidelines will be heavily penalized.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-brand-indigo to-slate-800 p-8 rounded-xl border border-white/10 mb-10">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Target className="w-7 h-7 text-brand-saffron" /> 
              Theme & Objectives
            </h2>
            <p className="text-slate-300 mb-6 text-sm md:text-base leading-relaxed">
              This year's theme focuses on <strong>"Sustainable Technology for Future Grids"</strong>. You are challenged to build software systems that optimize energy consumption, predict grid failures, or facilitate decentralized energy trading.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold mb-3 border border-brand-cyan/30">1</div>
                <h4 className="font-bold text-white text-sm mb-2">Ideation</h4>
                <p className="text-xs text-slate-400">Outline architecture and SDG targets.</p>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold mb-3 border border-brand-cyan/30">2</div>
                <h4 className="font-bold text-white text-sm mb-2">Prototyping</h4>
                <p className="text-xs text-slate-400">Build the core engine/API.</p>
              </div>
              <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-700 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-full bg-brand-cyan/20 flex items-center justify-center text-brand-cyan font-bold mb-3 border border-brand-cyan/30">3</div>
                <h4 className="font-bold text-white text-sm mb-2">Final Polish</h4>
                <p className="text-xs text-slate-400">UI/UX refinement and final submission.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
             <button 
               onClick={handleAcceptRules}
               className="bg-brand-cyan text-slate-900 font-bold px-10 py-4 rounded-full flex items-center gap-3 hover:bg-brand-cyan/90 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
             >
               I Understand, Proceed to Dashboard
               <ChevronRight className="w-5 h-5" />
             </button>
             <p className="text-xs text-slate-500 mt-4 text-center">By clicking proceed, you electronically sign your acceptance of the Tarang2k26 Code of Conduct.</p>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // VIEW: MAIN PARTICIPANT DASHBOARD
  // -----------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand-cyan animate-spin" />
          <p className="text-brand-cyan font-semibold text-lg animate-pulse-slow">Loading Arena Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      {/* Configuration Status Banner */}
      {config && !config.is_active && (
        <div className="bg-red-500/20 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <div>
            <h3 className="text-red-400 font-bold">Hackathon Paused</h3>
            <p className="text-red-200 text-sm">The hackathon is currently paused by administrators. Submissions may be disabled.</p>
          </div>
        </div>
      )}

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col lg:flex-row gap-8 mb-10">
        
        {/* Left Col: Team Info */}
        <div className="flex-1 glass-panel p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          
          <h2 className="text-sm font-bold text-brand-cyan uppercase tracking-wider mb-1">Your Team</h2>
          <h1 className="text-4xl font-black text-white mb-2">{team?.team_name}</h1>
          {team?.project_title && (
            <p className="text-brand-saffron font-medium text-lg mb-4 flex items-center gap-2">
              <Target className="w-4 h-4" /> {team.project_title}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold mb-1">Status</p>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse" />
                {team?.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold mb-1">Members</p>
              <div className="flex -space-x-2">
                {team?.members.map((m, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-brand-indigo border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-brand-cyan" title={m.name}>
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Stats / Annc */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col justify-center">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-brand-saffron" /> Global Progress
            </h3>
            <div className="text-3xl font-bold text-white mb-1">
              {Object.keys(submissions).length} <span className="text-lg text-slate-500 font-normal">/ {objectives.length}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 mt-2">
               <div 
                 className="bg-gradient-to-r from-brand-cyan to-brand-saffron h-2.5 rounded-full transition-all duration-1000" 
                 style={{ width: `${(Object.keys(submissions).length / Math.max(objectives.length, 1)) * 100}%` }}
               />
            </div>
          </div>

          {config?.current_announcement && (
            <div className="glass-panel p-4 rounded-xl border border-brand-indigo/50 bg-brand-indigo/20">
              <p className="text-xs font-bold text-brand-cyan uppercase mb-1">Admin Broadcast</p>
              <p className="text-sm text-slate-300 italic">"{config.current_announcement}"</p>
            </div>
          )}
        </div>
      </div>

      {/* CORE OBJECTIVES FLOW */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Target className="w-6 h-6 text-brand-cyan" /> Action Items
        </h2>
        
        <div className="space-y-6">
          {objectives.map((obj) => {
            const isCompleted = !!submissions[obj.id];
            const isActive = activeObjective === obj.id;
            const isLocked = !isCompleted && !isActive;

            return (
              <div 
                key={obj.id} 
                className={`transition-all duration-500 rounded-2xl overflow-hidden border ${
                  isActive ? 'border-brand-cyan shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-slate-900' :
                  isCompleted ? 'border-green-500/30 bg-slate-900/40' :
                  'border-slate-800 bg-slate-950/50 opacity-75'
                }`}
              >
                {/* Objective Header */}
                <div 
                  className={`p-6 flex items-center justify-between cursor-pointer ${isActive ? 'bg-brand-cyan/5' : ''}`}
                  onClick={() => {
                    // Only allow toggling if it's completed or active. Cannot skip ahead.
                    if (!isLocked) {
                      setActiveObjective(isActive ? null : obj.id);
                      setErrorDetails('');
                      setSuccessDetails('');
                    }
                  }}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 shadow-lg transition-colors ${
                      isCompleted ? 'bg-green-500/20 border-green-500 text-green-400' :
                      isActive ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan' :
                      'bg-slate-800 border-slate-700 text-slate-500'
                    }`}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : obj.order_no}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold transition-colors ${isCompleted ? 'text-green-50' : isActive ? 'text-white' : 'text-slate-400'}`}>
                        {obj.title}
                      </h3>
                      {isCompleted && submissions[obj.id]?.commit_sha && (
                         <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded inline-flex">
                           <GitCommit className="w-3 h-3 text-slate-500" />
                           {submissions[obj.id].commit_sha?.substring(0, 7)}
                         </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {isCompleted && (
                      <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        Synchronized
                      </span>
                    )}
                    {isLocked && (
                      <span className="hidden md:inline-flex text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Locked
                      </span>
                    )}
                    <ChevronRight className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${isActive ? 'rotate-90' : isCompleted ? '' : 'opacity-0'}`} />
                  </div>
                </div>

                {/* Objective Content Expansion */}
                {isActive && (
                  <div className="p-6 md:p-8 border-t border-slate-800 bg-slate-900/50">
                    <div className="max-w-3xl">
                      <p className="text-slate-300 text-lg leading-relaxed mb-8 border-l-4 border-brand-cyan pl-4">
                        {obj.description}
                      </p>

                      {errorDetails && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="text-sm">{errorDetails}</p>
                        </div>
                      )}

                      {successDetails && (
                         <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 flex items-start gap-3">
                         <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                         <p className="text-sm">{successDetails}</p>
                       </div>
                      )}

                      <form onSubmit={(e) => handleSubmission(e, obj.id)} className="space-y-6">
                        {/* Requirement 1: Description/Notes */}
                        <div>
                          <label className="block text-sm font-semibold text-slate-300 mb-2">
                            Implementation Notes (Optional)
                          </label>
                          <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Briefly describe your approach, architecture decisions, or any instructions for the judges..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan min-h-[120px] transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Requirement 2: File Upload */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                              Artifact Upload
                            </label>
                            <label className="flex items-center justify-center w-full h-32 px-4 transition bg-slate-950 border-2 border-slate-700 border-dashed rounded-lg appearance-none cursor-pointer hover:border-brand-cyan focus:outline-none group">
                               {file ? (
                                  <div className="flex flex-col items-center gap-2">
                                     <FileUp className="w-8 h-8 text-brand-cyan" />
                                     <span className="text-sm font-medium text-white truncate max-w-[200px]">{file.name}</span>
                                     <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                  </div>
                               ) : (
                                  <div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-brand-cyan transition-colors">
                                     <Upload className="w-8 h-8" />
                                     <span className="text-sm font-medium">Click to browse or drop file</span>
                                     <span className="text-xs opacity-75">PDF, ZIP, PNG up to 10MB</span>
                                  </div>
                               )}
                               <input type="file" name="file_upload" className="hidden" onChange={(e) => {
                                 if (e.target.files && e.target.files.length > 0) {
                                   setFile(e.target.files[0]);
                                 }
                               }} />
                            </label>
                          </div>

                          {/* Requirement 3: Repository Link */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                              <Github className="w-4 h-4" /> GitHub Repository Hook
                            </label>
                            <div className="flex flex-col gap-2 h-32 justify-end">
                              <div className="relative">
                                <input
                                  type="url"
                                  value={repoLink}
                                  onChange={e => setRepoLink(e.target.value)}
                                  placeholder="https://github.com/..."
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                                />
                                {repoLink && (
                                  <a href={repoLink} target="_blank" rel="noreferrer" className="absolute right-3 top-3.5 text-slate-500 hover:text-brand-cyan transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed bg-slate-950/50 p-2 rounded">
                                Link to your public repository. Our servers will automatically clone and parse the commit history for judging metrics.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Submission Progress / Button */}
                        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                          <div className="flex-1 mr-8">
                             {submitting && uploadProgress > 0 && (
                               <div className="flex flex-col gap-2">
                                 <div className="flex items-center justify-between text-xs font-bold font-mono text-brand-cyan">
                                   <span>UPLOADING ARTIFACTS...</span>
                                   <span>{uploadProgress}%</span>
                                 </div>
                                 <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                   <div className="bg-brand-cyan h-1.5 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                 </div>
                               </div>
                             )}
                          </div>
                          <button
                            type="submit"
                            disabled={submitting || (!file && !repoLink && !description)}
                            className="bg-brand-cyan text-slate-900 font-bold px-8 py-3 rounded-lg flex items-center gap-3 hover:bg-brand-cyan/90 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                Submit Objective
                                <GitCommit className="w-5 h-5" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {objectives.length > 0 && Object.keys(submissions).length === objectives.length && (
            <div className="glass-panel p-8 rounded-2xl border-2 border-brand-saffron flex flex-col items-center justify-center text-center mt-8 animate-fade-in shadow-[0_0_40px_rgba(245,158,11,0.2)]">
              <Trophy className="w-16 h-16 text-brand-saffron mb-4 animate-bounce" />
              <h2 className="text-3xl font-black text-white mb-2">Hackathon Fully Completed!</h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                Incredible work! Your team has synchronized all objectives successfully. 
                The judging panel will now review your artifacts. Keep an eye on the Leaderboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
