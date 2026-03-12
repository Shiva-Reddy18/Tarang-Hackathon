-- Tarang2k26 Hackathon Arena Schema
-- Paste this in the Supabase SQL Editor

-- Extensions
create extension if not exists "uuid-ossp";

-- 1. Users Table (extends auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  college text,
  role text check (role in ('admin', 'participant')) default 'participant',
  created_at timestamptz default now()
);

-- 2. Teams Table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  leader_id uuid references public.users(id) on delete restrict,
  members jsonb default '[]'::jsonb, -- Array of {id, name, email}
  project_title text,
  theme text,
  status text check (status in ('registered','idea_submitted','dev_started','prototype_done','final_submitted')) default 'registered',
  created_at timestamptz default now()
);

-- 3. Objectives Table (Static lookup)
create table public.objectives (
  id int primary key,
  title text not null,
  description text not null,
  order_no int not null unique
);

-- 4. Submissions Table
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  objective_id int references public.objectives(id),
  submitter_id uuid references public.users(id),
  description text,
  storage_path text,
  repo_link text,
  commit_sha text,
  created_at timestamptz default now()
);

-- 5. Leaderboard Table
create table public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade unique,
  score int default 0,
  updated_at timestamptz default now()
);

-- 6. Spins Table
create table public.spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  result text not null,
  created_at timestamptz default now()
);


-- Row Level Security (RLS) setup --
alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.objectives enable row level security;
alter table public.submissions enable row level security;
alter table public.leaderboard enable row level security;
alter table public.spins enable row level security;

-- Users RLS
-- Users can read their own row, Admins can read all.
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Admins can read all users" on public.users for select using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- Teams RLS
-- Anyone can see teams for leaderboard/etc
create policy "Anyone can see teams" on public.teams for select using (true);
-- Only participants can create a team
create policy "Participants can create teams" on public.teams for insert with check (
  auth.uid() = leader_id 
  and exists (select 1 from public.users where id = auth.uid() and role = 'participant')
);
-- Team members or leader can update team
create policy "Team members update team" on public.teams for update using (
  auth.uid() = leader_id or members @> concat('[{"id":"', auth.uid(), '"}]')::jsonb
);

-- Objectives RLS
-- Everyone can select objectives
create policy "Everyone can read objectives" on public.objectives for select using (true);

-- Submissions RLS
-- Anyone can read submissions (for admin dashboard, team view)
create policy "Anyone can read submissions" on public.submissions for select using (true);
-- Only team members can insert submissions for their team
create policy "Team members can insert submissions" on public.submissions for insert with check (
  exists (select 1 from public.teams where id = team_id and (leader_id = auth.uid() or members @> concat('[{"id":"', auth.uid(), '"}]')::jsonb))
);

-- Leaderboard RLS
-- Anyone can read leaderboard
create policy "Anyone can read leaderboard" on public.leaderboard for select using (true);
-- Anyone can update leaderboard (insecure client-side update for hackathon simplicity, ideally should be locked to admin/server)
create policy "Participants can update leaderboard" on public.leaderboard for insert with check (true);
create policy "Participants can update leaderboard eq" on public.leaderboard for update using (true);

-- Spins RLS
-- Users can see their own spins
create policy "Users see own spins" on public.spins for select using (auth.uid() = user_id);
-- Inserts happen via serverless function (service role) to prevent cheating, 
-- but we allow read/admin access.

-- Setup Storage Bucket
insert into storage.buckets (id, name, public) values ('team-submissions', 'team-submissions', false);

-- Storage RLS (Simple)
-- Note: Replace public with authenticated in production
create policy "Authenticated uploads" on storage.objects for insert with check (
  bucket_id = 'team-submissions' and auth.role() = 'authenticated'
);
create policy "Authenticated reads" on storage.objects for select using (
  bucket_id = 'team-submissions' and auth.role() = 'authenticated'
);

-- Setup Realtime
alter publication supabase_realtime add table public.leaderboard;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.submissions;
