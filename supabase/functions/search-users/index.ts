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
    const { searchTerm } = await req.json();
    if (!searchTerm) {
      return new Response(JSON.stringify({ error: 'Search term is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Initialize Supabase client with service role key for searching auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Search auth.users by email
    const { data: authUsersData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 100, // Fetch a reasonable number of users to search through
      page: 1,
    });

    if (authError) {
      console.error('Error listing users:', authError.message);
      throw new Error('Failed to search users.');
    }

    // Filter users by email containing the search term (case-insensitive)
    const filteredAuthUsers = authUsersData.users.filter(user =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get the IDs of the filtered users
    const userIds = filteredAuthUsers.map(user => user.id);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ profiles: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Fetch corresponding profiles from the public.profiles table
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', userIds);

    if (profileError) {
      console.error('Error fetching profiles:', profileError.message);
      throw new Error('Failed to retrieve user profiles.');
    }

    // Create a map for quick lookup of profile data by user ID
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Combine auth user data (for email) with profile data (for name/avatar)
    const combinedUsers = filteredAuthUsers.map(authUser => {
      const profile = profileMap.get(authUser.id);
      return {
        id: authUser.id,
        first_name: profile?.first_name || null,
        last_name: profile?.last_name || null,
        avatar_url: profile?.avatar_url || null,
        email: authUser.email, // Get email directly from auth.users
      };
    });

    return new Response(JSON.stringify({ profiles: combinedUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in search-users Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});