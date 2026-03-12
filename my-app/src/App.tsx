import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ObjectivesFlow from './pages/ObjectivesFlow';
import AdminDashboard from './pages/AdminDashboard';
import Leaderboard from './pages/Leaderboard';
import { useAppStore } from './store';
import { supabase } from './lib/supabase';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false, requireTeam = false }: { children: ReactNode, requireAdmin?: boolean, requireTeam?: boolean }) => {
  const { user, team, loading } = useAppStore();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-cyan">Loading...</div>;

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (requireAdmin && user.role !== 'admin' && user.role !== 'judge') {
    return <Navigate to="/arena" />; 
  }

  // Participants without teams (edge case since registration handles it now)
  if (requireTeam && !team && user.role === 'participant') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold text-red-400 mb-2">Team Missing</h2>
        <p className="text-slate-300">Your account is not associated with a registered team.</p>
        <p className="text-slate-400 text-sm mt-4">Please contact an administrator.</p>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  const { fetchUserAndTeam, user } = useAppStore();

  useEffect(() => {
    fetchUserAndTeam();
  }, [fetchUserAndTeam]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-cyan/30">
        
        {/* Navigation Bar / Header - Minimal for now */}
        <header className="fixed top-0 w-full z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <a href="/" className="text-2xl font-bold tracking-tighter">
              <span className="text-white">Tarang</span>
              <span className="text-brand-cyan">2k26</span>
            </a>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <a href="/leaderboard" className="text-slate-300 hover:text-white transition-colors">Leaderboard</a>
              {user ? (
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                  }}
                  className="text-slate-400 hover:text-white transition-colors border border-white/10 px-3 py-1 rounded"
                >
                  Logout
                </button>
              ) : (
                <a href="/auth" className="text-brand-cyan hover:underline">Login</a>
              )}
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="pt-16 pb-8 min-h-screen">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            
            <Route path="/arena" element={
              <ProtectedRoute requireTeam={true}>
                <ObjectivesFlow />
              </ProtectedRoute>
            } />

            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer className="w-full py-6 text-center text-slate-500 text-sm border-t border-white/5 bg-slate-950">
          <p>© 2026 Tarang Hackathon. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
