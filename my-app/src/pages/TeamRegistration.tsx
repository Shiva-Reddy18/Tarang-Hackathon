import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { Loader2, Users, Code, Mail } from 'lucide-react';

export default function TeamRegistration() {
  const { user, fetchUserAndTeam } = useAppStore();
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [member2Email, setMember2Email] = useState('');
  const [member2Name, setMember2Name] = useState('');
  const [member3Email, setMember3Email] = useState('');
  const [member3Name, setMember3Name] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const members = [
        { id: user.id, name: user.name, email: user.email }
      ];

      if (member2Email && member2Name) {
        members.push({ id: '', name: member2Name, email: member2Email }); 
      }
      if (member3Email && member3Name) {
        members.push({ id: '', name: member3Name, email: member3Email });
      }

      const { error } = await supabase.from('teams').insert({
        team_name: teamName,
        project_title: projectTitle || null,
        leader_id: user.id,
        members: members,
        status: 'registered'
      });

      if (error) throw error;

      await fetchUserAndTeam();
      navigate('/arena');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 mt-8">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-2xl shadow-2xl relative">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Form Your Squad</h2>
          <p className="text-slate-400">Register your team to enter the Tarang2k26 Arena.</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreateTeam} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-cyan flex items-center">
                <Users className="w-5 h-5 mr-2" /> Team Details
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                  placeholder="e.g. Byte Busters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center">
                  <Code className="w-4 h-4 mr-1"/> Project Idea (Optional)
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                  placeholder="e.g. AI Content Generator"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-brand-cyan flex items-center">
                <Users className="w-5 h-5 mr-2" /> Members (Optional)
              </h3>
              
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-3">
                <p className="text-xs text-slate-400 mb-2">Member 2</p>
                <input
                  type="text"
                  value={member2Name}
                  onChange={(e) => setMember2Name(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="Name"
                />
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2 text-slate-500" />
                  <input
                    type="email"
                    value={member2Email}
                    onChange={(e) => setMember2Email(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 space-y-3">
                <p className="text-xs text-slate-400 mb-2">Member 3</p>
                <input
                  type="text"
                  value={member3Name}
                  onChange={(e) => setMember3Name(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
                  placeholder="Name"
                />
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2 text-slate-500" />
                  <input
                    type="email"
                    value={member3Email}
                    onChange={(e) => setMember3Email(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-cyan"
                    placeholder="Email"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/50 flex justify-end">
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="bg-brand-cyan text-slate-900 font-bold rounded-lg px-8 py-3 flex items-center hover:bg-brand-cyan/90 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
              Create & Enter Arena
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
