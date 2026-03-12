import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { simpleGit, SimpleGit } from 'npm:simple-git';
import * as path from "https://deno.land/std@0.177.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.177.0/fs/walk.ts";
import { compress } from "https://deno.land/x/zip@v1.2.5/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { teamId } = await req.json();

    if (!teamId) {
      throw new Error('teamId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Fetch team metadata
    const { data: team, error: teamError } = await supabaseClient
      .from('teams')
      .select('*, users!teams_leader_id_fkey(name, email)')
      .eq('id', teamId)
      .single();

    if (teamError || !team) throw new Error('Team not found');

    // 2. Fetch submissions ordered by objective
    const { data: submissions, error: subError } = await supabaseClient
      .from('submissions')
      .select('*, objectives(*)')
      .eq('team_id', teamId)
      .order('objective_id', { ascending: true });

    if (subError) throw subError;

    // 3. Create a temporary directory for the repo
    const tempDir = await Deno.makeTempDir({ prefix: `repo_${teamId}_` });
    console.log(`Working directory: ${tempDir}`);

    // Initialize simple-git
    const git: SimpleGit = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'Tarang2k26 System');
    await git.addConfig('user.email', 'system@tarang2k26.org');

    // 4. Create base README and Initial Commit
    const readmeContent = `# ${team.project_title || team.team_name}
Team: ${team.team_name}
Leader: ${team.users?.name} (${team.users?.email})
Theme: ${team.theme || 'AI for Sustainable Futures'}

Auto-generated submission repository by Tarang2k26 Arena.
`;
    await Deno.writeTextFile(path.join(tempDir, 'README.md'), readmeContent);
    await git.add('./*');
    await git.commit('Initial commit - Hackathon Project Created');

    // 5. Build objective folders, download files, and commit sequentially
    for (const sub of submissions) {
      const objTitle = sub.objectives?.title || `objective-${sub.objective_id}`;
      const objDirName = `objective-0${sub.objective_id}`;
      const objDirPath = path.join(tempDir, objDirName);
      
      await Deno.mkdir(objDirPath, { recursive: true });

      // Generate objective description file
      await Deno.writeTextFile(path.join(objDirPath, 'submission.md'), `# ${objTitle}\n${sub.description}\n\nRepo Link: ${sub.repo_link || 'N/A'}`);

      // If there is an associated storage file, download it
      if (sub.storage_path) {
        const { data: fileData, error: downloadError } = await supabaseClient.storage
          .from('team-submissions')
          .download(sub.storage_path);
          
        if (fileData && !downloadError) {
          const fileName = path.basename(sub.storage_path);
          const arrayBuffer = await fileData.arrayBuffer();
          const view = new Uint8Array(arrayBuffer);
          await Deno.writeFile(path.join(objDirPath, fileName), view);
        }
      }

      // Add to git and commit with specific formatting
      await git.add('./*');
      const timestamp = new Date(sub.created_at).toISOString();
      const commitMsg = `objective-0${sub.objective_id}: ${objTitle} — completed by ${team.users?.name || 'team'} — ${timestamp}`;
      await git.commit(commitMsg);
    }

    // 6. Zip the entire repository
    // We zip the tempDir folder into a .zip file in OS tmp dir.
    const zipFilePath = await Deno.makeTempFile({ prefix: `team_${teamId}_`, suffix: '.zip' });
    
    // using compress from denoland x zip to package the repo
    await compress(tempDir, zipFilePath);

    // 7. Upload zip back to Supabase
    const zipBytes = await Deno.readFile(zipFilePath);
    const zipFileName = `final-repos/${teamId}-${Date.now()}.zip`;
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('team-submissions')
      .upload(zipFileName, zipBytes, { contentType: 'application/zip' });

    if (uploadError) throw uploadError;

    // Get signed URL for immediate download
    const { data: signedUrlData } = await supabaseClient.storage
      .from('team-submissions')
      .createSignedUrl(uploadData.path, 60 * 60 * 24); // 24 hours

    // Clean up temp local data
    try {
      await Deno.remove(tempDir, { recursive: true });
      await Deno.remove(zipFilePath);
    } catch(e) {
      console.warn("Cleanup error", e);
    }

    // Optionally handle GitHub push here if GITHUB_TOKEN is present
    let remoteUrl = null;
    if (Deno.env.get('GITHUB_TOKEN') && Deno.env.get('GITHUB_OWNER')) {
      // Stub for GitHub API create repo + push using git remote add
      remoteUrl = `https://github.com/${Deno.env.get('GITHUB_OWNER')}/${team.team_name.replace(/\s+/g, '-')}`;
    }

    return new Response(
      JSON.stringify({ zipUrl: signedUrlData?.signedUrl, remoteUrl, message: 'Repo created successfully' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
