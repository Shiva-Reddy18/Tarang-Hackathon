-- Tarang2k26 Hackathon Arena Schema - Multi-Role Upgrade

create extension if not exists "uuid-ossp";

-- 1. Users Table
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  college text,
  role text check (role in ('admin', 'participant', 'judge')) default 'participant',
  created_at timestamptz default now()
);

-- 2. Hackathon Admin Config
-- Allows admins to globally control the hackathon
create table public.admin_config (
  id int primary key default 1,
  is_active boolean default true,
  start_time timestamptz default now(),
  end_time timestamptz default (now() + interval '3 days'),
  current_announcement text default 'Welcome to Tarang2k26! Get ready to hack.',
  updated_at timestamptz default now(),
  constraint config_singleton check (id = 1)
);

-- 3. Teams Table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  leader_id uuid references public.users(id) on delete restrict,
  members jsonb default '[]'::jsonb, -- Array of {id, name, email}
  project_title text,
  theme text,
  status text check (status in ('registered','idea_submitted','dev_started','prototype_done','final_submitted', 'disqualified')) default 'registered',
  created_at timestamptz default now()
);

-- 4. Objectives Table
create table public.objectives (
  id int primary key,
  title text not null,
  description text not null,
  order_no int not null unique
);

-- 5. Submissions Table
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

-- 6. Judging Scores Table
-- Judges submit scores per team
create table public.judging_scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  judge_id uuid references public.users(id) on delete cascade,
  score_innovation int check (score_innovation between 0 and 25) default 0,
  score_technical int check (score_technical between 0 and 25) default 0,
  score_design int check (score_design between 0 and 25) default 0,
  score_presentation int check (score_presentation between 0 and 25) default 0,
  total_score int generated always as (score_innovation + score_technical + score_design + score_presentation) stored,
  feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(team_id, judge_id) -- A judge can only score a team once (they can update it)
);

-- 7. Leaderboard Table
create table public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade unique,
  score int default 0, -- Base objective/arena score
  judge_score int default 0, -- Aggregate of all judging scores
  total_computed_score int generated always as (score + judge_score) stored,
  updated_at timestamptz default now()
);

-- 8. Spins Table (Mini-game/Bonus)
create table public.spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  result text not null,
  created_at timestamptz default now()
);

-- Row Level Security (RLS) setup --
alter table public.users enable row level security;
alter table public.admin_config enable row level security;
alter table public.teams enable row level security;
alter table public.objectives enable row level security;
alter table public.submissions enable row level security;
alter table public.judging_scores enable row level security;
alter table public.leaderboard enable row level security;
alter table public.spins enable row level security;

-- Utility Function for determining roles
create or replace function public.is_admin() returns boolean as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'admin');
$$ language sql security definer;

create or replace function public.is_judge() returns boolean as $$
  select exists(select 1 from public.users where id = auth.uid() and role = 'judge');
$$ language sql security definer;

-- Admin Config RLS
create policy "Anyone can read config" on public.admin_config for select using (true);
create policy "Only admins can edit config" on public.admin_config for update using (public.is_admin());
create policy "Only admins can insert config" on public.admin_config for insert with check (public.is_admin());

-- Users RLS
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Admins and Judges can read all users" on public.users for select using (public.is_admin() or public.is_judge());
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);
create policy "Admins can update users" on public.users for update using (public.is_admin());

-- Teams RLS
create policy "Anyone can see teams" on public.teams for select using (true);
create policy "Participants can create teams" on public.teams for insert with check (
  auth.uid() = leader_id 
  and exists (select 1 from public.users where id = auth.uid() and role = 'participant')
);
create policy "Team members update team" on public.teams for update using (
  auth.uid() = leader_id or members @> concat('[{"id":"', auth.uid(), '"}]')::jsonb
);
create policy "Admins can update any team" on public.teams for update using (public.is_admin());
create policy "Admins can delete teams" on public.teams for delete using (public.is_admin());

-- Objectives RLS
create policy "Everyone can read objectives" on public.objectives for select using (true);
create policy "Admins can manage objectives (insert)" on public.objectives for insert with check (public.is_admin());
create policy "Admins can manage objectives (update)" on public.objectives for update using (public.is_admin());
create policy "Admins can manage objectives (delete)" on public.objectives for delete using (public.is_admin());

-- Submissions RLS
create policy "Anyone can read submissions" on public.submissions for select using (true);
create policy "Team members can insert submissions" on public.submissions for insert with check (
  exists (select 1 from public.teams where id = team_id and (leader_id = auth.uid() or members @> concat('[{"id":"', auth.uid(), '"}]')::jsonb))
);

-- Judging Scores RLS
create policy "Anyone can read judging scores" on public.judging_scores for select using (true);
create policy "Judges can insert own scores" on public.judging_scores for insert with check (public.is_judge() and judge_id = auth.uid());
create policy "Judges can update own scores" on public.judging_scores for update using (public.is_judge() and judge_id = auth.uid());
create policy "Admins can manage judging scores" on public.judging_scores for all using (public.is_admin());

-- Leaderboard RLS
create policy "Anyone can read leaderboard" on public.leaderboard for select using (true);
create policy "Participants can insert leaderboard" on public.leaderboard for insert with check (true);
create policy "Participants can update leaderboard eq" on public.leaderboard for update using (true);
create policy "Admins can delete leaderboard" on public.leaderboard for delete using (public.is_admin());

-- Spins RLS
create policy "Users see own spins" on public.spins for select using (auth.uid() = user_id);
create policy "Admins can see all spins" on public.spins for select using (public.is_admin());

-- Setup Storage Bucket (run once manually or idempotently if possible, omitting here to avoid errors if exists)
-- IF NOT EXISTS handles buckets generally but we rely on the dashboard setup.
-- insert into storage.buckets (id, name, public) values ('team-submissions', 'team-submissions', false);

-- Storage RLS (Simple)
create policy "Authenticated uploads" on storage.objects for insert with check (
  bucket_id = 'team-submissions' and auth.role() = 'authenticated'
);
create policy "Authenticated reads" on storage.objects for select using (
  bucket_id = 'team-submissions' and auth.role() = 'authenticated'
);

-- Setup Realtime
alter publication supabase_realtime add table public.admin_config;
alter publication supabase_realtime add table public.leaderboard;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.submissions;
alter publication supabase_realtime add table public.judging_scores;


-- INITIALLIZE ADMIN CONFIG
insert into public.admin_config (id, is_active) values (1, true) on conflict (id) do nothing;
