-- Insert Default Objectives for Tarang2k26 Hackathon
-- Run this in your Supabase SQL Editor to populate the "Action Items"

INSERT INTO public.objectives (id, title, description, order_no) 
VALUES 
  (1, 'Ideation & Architecture', 'Submit your initial project idea, the problem you are solving, and a brief description of your planned technical architecture.', 1),
  (2, 'Core Prototyping', 'Upload your first working prototype or proof-of-concept. This must include the fundamental logic or core UI components.', 2),
  (3, 'Final Submission & Polish', 'Submit the final, polished web application along with your GitHub repository link. Ensure all judging criteria are met.', 3)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title, 
  description = EXCLUDED.description, 
  order_no = EXCLUDED.order_no;
