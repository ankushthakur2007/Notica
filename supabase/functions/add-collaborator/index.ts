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

    // Use the more efficient and secure admin method to get the user by their email
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (userError || !user) {
        return new Response(JSON.stringify({ error: "User with that email not found." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404, // Not Found
        });
    }

    // Insert the new collaborator
    const { error: insertError } = await supabaseAdmin
      .from('collaborators')
      .insert({
        note_id,
        user_id: user.id,
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