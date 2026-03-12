export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string | null
          college: string | null
          role: 'admin' | 'participant'
          created_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          college?: string | null
          role?: 'admin' | 'participant'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          college?: string | null
          role?: 'admin' | 'participant'
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          team_name: string
          leader_id: string
          members: Json
          project_title: string | null
          theme: string | null
          status: 'registered' | 'idea_submitted' | 'dev_started' | 'prototype_done' | 'final_submitted'
          created_at: string
        }
        Insert: {
          id?: string
          team_name: string
          leader_id: string
          members?: Json
          project_title?: string | null
          theme?: string | null
          status?: 'registered' | 'idea_submitted' | 'dev_started' | 'prototype_done' | 'final_submitted'
          created_at?: string
        }
        Update: {
          id?: string
          team_name?: string
          leader_id?: string
          members?: Json
          project_title?: string | null
          theme?: string | null
          status?: 'registered' | 'idea_submitted' | 'dev_started' | 'prototype_done' | 'final_submitted'
          created_at?: string
        }
      }
      objectives: {
        Row: {
          id: number
          title: string
          description: string
          order_no: number
        }
        Insert: {
          id: number
          title: string
          description: string
          order_no: number
        }
        Update: {
          id?: number
          title?: string
          description?: string
          order_no?: number
        }
      }
      submissions: {
        Row: {
          id: string
          team_id: string
          objective_id: number
          submitter_id: string
          description: string | null
          storage_path: string | null
          repo_link: string | null
          commit_sha: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          objective_id: number
          submitter_id: string
          description?: string | null
          storage_path?: string | null
          repo_link?: string | null
          commit_sha?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          objective_id?: number
          submitter_id?: string
          description?: string | null
          storage_path?: string | null
          repo_link?: string | null
          commit_sha?: string | null
          created_at?: string
        }
      }
      leaderboard: {
        Row: {
          id: string
          team_id: string
          score: number
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          score?: number
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          score?: number
          updated_at?: string
        }
      }
      spins: {
        Row: {
          id: string
          user_id: string
          result: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          result: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          result?: string
          created_at?: string
        }
      }
    }
  }
}
