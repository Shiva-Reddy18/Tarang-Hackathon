import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import TeamRegistration from './pages/TeamRegistration';
import ObjectivesFlow from './pages/ObjectivesFlow';
import AdminDashboard from './pages/AdminDashboard';
import Leaderboard from './pages/Leaderboard';
import { useAppStore } from './store';

// Protected Route Wrapper
const ProtectedRoute = ({ children, requireAdmin = false, requireTeam = false }: { children: ReactNode, requireAdmin?: boolean, requireTeam?: boolean }) => {
  const { user, team, loading } = useAppStore();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-brand-cyan">Loading...</div>;

  if (!user) {
    return <Navigate to="/auth" />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" />; // Or wherever non-admins belong
  }

  if (requireTeam && !team && user.role !== 'admin') {
    return <Navigate to="/register-team" />;
  }

  return <>{children}</>;
};

function App() {
  const { fetchUserAndTeam } = useAppStore();

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
            <nav className="flex space-x-6 text-sm font-medium">
              <a href="/leaderboard" className="text-slate-300 hover:text-white transition-colors">Leaderboard</a>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="pt-16 pb-8 min-h-screen">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            
            {/* Protected Participant Routes */}
            <Route path="/register-team" element={
              <ProtectedRoute>
                <TeamRegistration />
              </ProtectedRoute>
            } />
            
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
