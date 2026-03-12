import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Multi-Role user architecture
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  college: string | null;
  role: 'admin' | 'participant' | 'judge';
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
}

export interface Team {
  id: string;
  team_name: string;
  leader_id: string;
  members: TeamMember[];
  project_title: string | null;
  theme: string | null;
  status: 'registered' | 'idea_submitted' | 'dev_started' | 'prototype_done' | 'final_submitted' | 'disqualified';
  created_at: string;
}

export interface AdminConfig {
  id: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  current_announcement: string | null;
}

interface AppState {
  user: User | null;
  team: Team | null;
  config: AdminConfig | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setTeam: (team: Team | null) => void;
  fetchUserAndTeam: () => Promise<void>;
  fetchConfig: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  team: null,
  config: null,
  loading: true,
  setUser: (user) => set({ user }),
  setTeam: (team) => set({ team }),
  
  fetchConfig: async () => {
    const { data } = await supabase.from('admin_config').select('*').eq('id', 1).single();
    if (data) {
      set({ config: data as AdminConfig });
    }
  },

  fetchUserAndTeam: async () => {
    set({ loading: true });
    
    // Always fetch config
    await get().fetchConfig();

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      set({ user: null, team: null, loading: false });
      return;
    }

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

    set({ user: userData as User });

    // Fetch user's team if they are a participant
    if (userData.role === 'participant') {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .or(`leader_id.eq.${userData.id},members.cs.[{"id":"${userData.id}"}]`)
        .maybeSingle();
      
      if (!teamError && teamData) {
        set({ team: teamData as Team });
      } else {
        set({ team: null }); // explicitly null if err or none
      }
    } else {
       set({ team: null }); // Admins and judges don't have personal teams
    }

    set({ loading: false });
  }
}));
