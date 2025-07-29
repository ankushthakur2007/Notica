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
      throw new Error('note_id, email, and permission_level are required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Find the user to add as a collaborator by email
    const { data: { users }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
    if (listUsersError) throw listUsersError;

    const collaboratorUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!collaboratorUser) {
      throw new Error('User with that email not found.');
    }

    // Insert the new collaborator
    // RLS policy "Note owner can add collaborators" will enforce that only the owner can perform this action.
    const { error: insertError } = await supabaseAdmin
      .from('collaborators')
      .insert({
        note_id,
        user_id: collaboratorUser.id,
        permission_level,
      })
      .select();

    if (insertError) {
      if (insertError.code === '23505') { // unique_violation
        throw new Error('This user is already a collaborator on this note.');
      }
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})