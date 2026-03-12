# Tarang2k26 - Hackathon Arena

Welcome to the **Tarang2k26 Hackathon Arena**, an interactive platform for managing hackathons with sequential objectives, mini-games, a spin wheel, real-time leaderboards, and auto-generated git repository submissions.

## Tech Stack
- Frontend: Vite + React + TypeScript + TailwindCSS (JIT) + Zustand
- Backend: Supabase (Auth, Postgres, Storage, Realtime)
- Serverless: Supabase Edge Functions (Deno)

---

## 🚀 Quick Setup & Deployment

### 1. Supabase Project Setup
1. Create a new project at [Supabase](https://supabase.com/).
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql` to create tables and configure Row-Level Security (RLS).
3. Run the contents of `supabase/seed.sql` to populate initial objectives.
4. From the Supabase Dashboard:
   - Go to Authentication > Providers and verify Email provider is enabled.
   - Go to Storage and ensure the `team-submissions` bucket is created.
   - Create an admin user via the Auth UI: `admin@tarang2k26.org` (password of choice). Note their UUID, and update their role in the `users` table to `admin`.

### 2. Environment Variables
Create a `.env.local` file in the root directory (based on `.env.example`):
```env
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Provide these only to your Edge Functions / CI, NOT the frontend client!
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
# GITHUB_TOKEN=ghp_xxx (Optional: for direct GitHub pushes)
# GITHUB_OWNER=tarang2k26 (Optional)
```

### 3. Running Locally
Install dependencies and run the Vite server:
```bash
npm install
npm run dev
```

### 4. Deploying Edge Functions
Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and link your project.
```bash
supabase login
supabase link --project-ref <your-project-id>

# Deploy the Spin Wheel function
supabase functions deploy spin --no-verify-jwt

# Deploy the Repo Generation function
supabase functions deploy create-repo --no-verify-jwt

# Set secrets for your Edge Functions
supabase secrets set SUPABASE_URL=https://<your-project-id>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 5. Deploying the Client
The Vite app can be deployed anywhere, such as Vercel, Netlify, or Cloudflare Pages.
1. Link your GitHub repo to Vercel.
2. Set the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. Build command: `npm run build`
4. Output directory: `dist`

---

## ✨ Features included
- **Landing & Auth**: Animated wave UI, segregated Admin and Participant flows.
- **Team Formation**: Create or join teams logic securely isolated by RLS.
- **Sequential Objectives (Arena)**: Submitting objective 1 unlocks objective 2, tracking progress through a central dashboard.
- **Bug Hunter Mini-game**: A fully playable `<ArenaGame />` where participants catch moving bugs for points.
- **Spin Wheel Bonus**: A server-verified deterministic spin wheel awarding points/hints.
- **Realtime Leaderboard**: Live global ranking via Supabase Realtime subscriptions.
- **Serverless Git Generation**: Upon finalizing submission, the `create-repo` Edge function downloads files from Supabase Storage, builds a valid Git repository locally, commits each objective sequentially, and zips it up for admin download.

---

## 🧪 Testing & CI
Unit tests for core logic are written with Vitest.
```bash
npm test
```
A GitHub Actions workflow (`.github/workflows/ci.yml`) is provided for automated linting and type checking on every Push/PR to `main`.

---

## 📖 Short Demo & Admin Usage
**Simulate Games:**
To quickly simulate teams, log in to the App, create a couple of mock teams, play the bug hunter game, and run the spin wheel. 
As an Admin, log in with `admin@tarang2k26.org`, view the realtime telemetry dashboard, and observe the scores.

Once a team finishes "Objective 3", click **Finalize & Generate Repo**. The edge function will compile the `zip` containing the full local Git history. The admin can click the resulting **Get Git Repo (.zip)** button in the dashboard.

*Note regarding "simulate 10 test games and produce 10 repo zips in one command": A script can be authored to directly invoke the Supabase Functions `POST /create-repo` via curl with mock UUIDs, provided mock submissions exist in the DB.*

---
### Security Note
- Edge Functions sanitize filenames natively, but always inspect downloaded ZIPS.
- The `supabase.ts` frontend client relies on RLS to prevent teams from seeing or modifying other teams' data.
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` in `VITE_` variables.**
