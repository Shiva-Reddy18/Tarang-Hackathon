import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  college: string | null;
  role: 'admin' | 'participant';
  created_at: string;
}

interface Team {
  id: string;
  team_name: string;
  leader_id: string;
  members: unknown;
  project_title: string | null;
  theme: string | null;
  status: string;
  created_at: string;
}


interface AppState {
  user: User | null;
  team: Team | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setTeam: (team: Team | null) => void;
  fetchUserAndTeam: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  team: null,
  loading: true,
  setUser: (user) => set({ user }),
  setTeam: (team) => set({ team }),
  fetchUserAndTeam: async () => {
    set({ loading: true });
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      set({ user: null, team: null, loading: false });
      return;
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      console.error('Error fetching user:', userError);
      set({ user: null, team: null, loading: false });
      return;
    }

    set({ user: userData });

    // Fetch user's team if they are a participant
    if (userData.role === 'participant') {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        // Using contains for JSONB member check, team leader check
        .or(`leader_id.eq.${userData.id},members.cs.[{"id":"${userData.id}"}]`)
        .maybeSingle();
      
      if (!teamError && teamData) {
        set({ team: teamData });
      }
    }

    set({ loading: false });
  }
}));
