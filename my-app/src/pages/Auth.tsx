import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const isAdminLogin = searchParams.get('admin') === 'true';
  const navigate = useNavigate();
  const { fetchUserAndTeam, user } = useAppStore();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration specific fields
  const [name, setName] = useState('');
  const [college, setCollege] = useState('');
  const [teamName, setTeamName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');

  // Avoid showing login if already authenticated
  useEffect(() => {
    if (user) {
      if (isAdminLogin && user.role !== 'admin' && user.role !== 'judge') {
        return; // Let them stay to see error or logout
      }
      
      // Route based on role
      if (user.role === 'admin' || user.role === 'judge') {
        navigate('/admin');
      } else {
        navigate('/arena');
      }
    }
  }, [user, navigate, isAdminLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        await fetchUserAndTeam();
        
      } else {
        // --- SIGNUP FLOW (PARTICIPANTS ONLY) ---
        if (isAdminLogin) {
          throw new Error("Admins/Judges must be created directly in the database.");
        }

        // 1. Create Auth User
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        if (!data.user) {
           throw new Error("Signup failed. Please try again.");
        }

        // 2. Create User Profile
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          name: name,
          college: college,
          role: 'participant',
        });
        
        if (profileError) throw profileError;

        // 3. Create Team automatically for the participant
        const { error: teamError } = await supabase.from('teams').insert({
          team_name: teamName,
          project_title: projectTitle || null,
          leader_id: data.user.id,
          members: [{ id: data.user.id, name: name, email: email }], // Leader is first member
          status: 'registered'
        });

        if (teamError) throw teamError;

        // 4. Force refresh of global state
        await fetchUserAndTeam();
        setSuccessMsg("Registration successful! Redirecting to Arena...");
        
        setTimeout(() => {
           navigate('/arena');
        }, 1500);
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      if (!successMsg) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-12">
      <div className={`glass-panel p-8 rounded-2xl w-full ${!isLogin ? 'max-w-2xl' : 'max-w-md'} shadow-2xl relative overflow-hidden transition-all duration-500`}>
        {isAdminLogin && (
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-saffron" />
        )}
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {isAdminLogin ? (
              <span className="text-brand-saffron">Staff Portal</span>
            ) : (
              <span>{isLogin ? 'Welcome Back' : 'Participant Registration'}</span>
            )}
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            {isAdminLogin 
              ? "Login for Admins and Judges."
              : (isLogin ? "Sign in to access your dashboard." : "Complete the form below to create your account and team.")
            }
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SIGN UP FIELDS - SPLIT INTO TWO COLUMNS IF NOT LOGIN */}
          {!isLogin && !isAdminLogin && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-brand-cyan font-semibold border-b border-white/10 pb-2">Personal Info</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">College/University *</label>
                  <input
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                    placeholder="Tech University"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-brand-saffron font-semibold border-b border-white/10 pb-2">Team Info</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Team Name *</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-saffron focus:ring-1 focus:ring-brand-saffron transition-colors"
                    placeholder="Byte Busters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Project Title</label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-saffron focus:ring-1 focus:ring-brand-saffron transition-colors"
                    placeholder="Awesome Web App (Optional)"
                  />
                </div>

                <div className="bg-brand-indigo/50 p-4 rounded-lg border border-brand-cyan/20 mt-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong className="text-brand-cyan block mb-1">Note to Leaders:</strong> 
                    By registering, you represent your team. You will be able to add extra members or update the project title later from your dashboard if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN FIELDS */}
          {isLogin && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-bold rounded-lg px-4 py-3.5 flex items-center justify-center transition-all disabled:opacity-70 mt-6 shadow-lg ${
              !isLogin ? 'bg-gradient-to-r from-brand-cyan to-blue-600 text-white hover:opacity-90' : 'bg-brand-cyan text-slate-900 hover:bg-brand-cyan/90'
            }`}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In Securely' : 'Complete Registration & Enter Arena')}
          </button>
        </form>

        {!isAdminLogin && (
          <div className="mt-8 pt-6 border-t border-slate-700/50 text-center text-sm text-slate-400">
            {isLogin ? "Don't have a team yet? " : "Already registered your team? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="text-brand-cyan hover:underline font-semibold ml-1"
            >
              {isLogin ? 'Register Now' : 'Log in here'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
