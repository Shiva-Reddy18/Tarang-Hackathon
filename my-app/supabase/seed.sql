-- Seed Info for Tarang2k26
-- Paste this in the Supabase SQL Editor after running schema.sql

-- 1. Create Objectives
INSERT INTO public.objectives (id, title, description, order_no) VALUES
(1, 'Concept & Architecture', 'Submit your idea, target SDG, and high-level architecture diagram. Include a brief README outlining the problem.', 1),
(2, 'Core Implementation', 'Build the MVP. Submit the main logic, API integrations, or core algorithm code.', 2),
(3, 'Final Polish & Demo', 'Submit the final working prototype, UI components, and a video link or detailed screenshots.', 3)
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, order_no = EXCLUDED.order_no;

-- Note on Admin:
-- Do not seed the admin user via SQL directly. 
-- INSTEAD: Register through the Supabase Authentication dashboard (Sign Up) 
-- using 'admin@tarang2k26.org' and 'TarangAdmin!2026'.
-- THEN: update `users` table where email='admin@tarang2k26.org' set role='admin'

-- (Optional) Dummy Teams & Leaderboard
-- Only run if you want immediate test data. Requires exact UUIDs or subqueries.
/*
-- First register a dummy user via UI to get a user UUID, then:
-- DO $$
-- DECLARE dummy_user_id uuid := 'REPLACE_WITH_UUID';
-- DECLARE dummy_team_id uuid := gen_random_uuid();
-- BEGIN
--   INSERT INTO public.teams (id, team_name, leader_id, status) VALUES (dummy_team_id, 'Test Squad Alpha', dummy_user_id, 'registered');
--   INSERT INTO public.leaderboard (team_id, score) VALUES (dummy_team_id, 150);
-- END $$;
*/
