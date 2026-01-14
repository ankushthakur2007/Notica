import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { note_id, email, permission_level } = await req.json()
    if (!note_id || !email || !permission_level) {
      return new Response(JSON.stringify({ error: 'note_id, email, and permission_level are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Use the admin API to list users and find by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(JSON.stringify({ error: 'Failed to search for user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Find user by email (case-insensitive)
    const user = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(JSON.stringify({ error: 'User with that email not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Check if the user has a profile (required due to foreign key constraint)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Create a profile for the user if it doesn't exist
      const { error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: user.id })
        .select()
        .single();
      
      if (createProfileError) {
        console.error('Error creating profile:', createProfileError);
        return new Response(JSON.stringify({ error: 'User found but their profile could not be created.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    // Check if the user is already a collaborator
    const { data: existingCollab, error: checkError } = await supabaseAdmin
      .from('collaborators')
      .select('id')
      .eq('note_id', note_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing collaborator:', checkError);
      return new Response(JSON.stringify({ error: 'Failed to check existing collaborators.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (existingCollab) {
      return new Response(JSON.stringify({ error: 'This user is already a collaborator on this note.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // Insert the new collaborator
    const { error: insertError } = await supabaseAdmin
      .from('collaborators')
      .insert({
        note_id,
        user_id: user.id,
        permission_level,
      });

    if (insertError) {
      console.error('Error inserting collaborator:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to add collaborator: ' + insertError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})