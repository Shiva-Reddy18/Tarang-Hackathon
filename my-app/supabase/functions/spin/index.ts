import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRIZES = ["+5 Pts", "+10 Pts", "Extra Hint", "+20 Pts", "Skip Obj", "No Prize"];

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Check if user already spun
    const { data: existingSpin, error: fetchError } = await supabaseClient
      .from('spins')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingSpin) {
      // User already spun, tell them their previous outcome
      return new Response(
        JSON.stringify({ outcome: existingSpin.result, alreadySpun: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine spin deterministically/randomly server side
    const outcomeIndex = Math.floor(Math.random() * PRIZES.length);
    const outcome = PRIZES[outcomeIndex];

    // Transactionally issue spin record
    const { error: insertError } = await supabaseClient
      .from('spins')
      .insert({ user_id: userId, result: outcome });

    if (insertError) {
      // If constraint violation, someone just spun concurrently. Handle gracefully ideally.
      throw insertError;
    }

    // Apply prize logic. 
    // E.g. Add score for points
    if (outcome.includes('Pts')) {
      const points = parseInt(outcome.match(/\d+/)?.[0] || '0', 10);
      if (points > 0) {
        // We need team_id to add score. Let's fetch the user's team.
        const { data: teamData } = await supabaseClient.from('teams').select('id').or(`leader_id.eq.${userId},members.cs.[{"id":"${userId}"}]`).maybeSingle();
        
        if (teamData?.id) {
            // Upsert leaderboard score
            // To do this properly, we need to read current score and add.
            const { data: currentScore } = await supabaseClient.from('leaderboard').select('score').eq('team_id', teamData.id).maybeSingle();
            const newScore = (currentScore?.score || 0) + points;
            await supabaseClient.from('leaderboard').upsert({ team_id: teamData.id, score: newScore, updated_at: new Date().toISOString() });
        }
      }
    }

    return new Response(
      JSON.stringify({ outcome, applied: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
