import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userIds } = await req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: 'User IDs array is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Initialize Supabase client with service role key to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch user emails from auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 100, // Adjust as needed, max 100 per page
      page: 1,
    });

    if (authError) {
      console.error('Error listing auth users:', authError.message);
      throw new Error('Failed to fetch user emails.');
    }

    const userEmailMap = new Map();
    authUsers.users.forEach(user => {
      if (userIds.includes(user.id)) {
        userEmailMap.set(user.id, user.email);
      }
    });

    // Fetch profiles from public.profiles
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', userIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError.message);
      throw new Error('Failed to retrieve user profiles.');
    }

    // Combine data
    const combinedUsers = profiles.map(profile => ({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      email: userEmailMap.get(profile.id) || null, // Add email from auth.users
    }));

    return new Response(JSON.stringify({ users: combinedUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in get-user-details-by-ids Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});