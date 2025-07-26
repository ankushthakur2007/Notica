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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { summarizeTextWithGemini } = await import('../_shared/summarizer.ts');

    const { youtubeUrl, userId } = await req.json();
    if (!youtubeUrl || !userId) {
      throw new Error('youtubeUrl and userId are required.');
    }

    // --- NEW RELIABLE TRANSCRIPT LOGIC ---

    // 1. Extract Video ID from various YouTube URL formats
    const url = new URL(youtubeUrl);
    let videoId = url.searchParams.get('v');
    if (!videoId) {
      // Handle short URLs like youtu.be/VIDEO_ID
      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1);
      }
    }

    if (!videoId) {
      throw new Error('Invalid YouTube URL. Could not find Video ID.');
    }

    // 2. Call the new reliable RapidAPI endpoint
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    const rapidApiHost = Deno.env.get('RAPIDAPI_HOST');
    
    if (!rapidApiKey || !rapidApiHost) {
        throw new Error('RapidAPI credentials are not set in environment variables.');
    }
    
    const response = await fetch(`https://${rapidApiHost}/transcript/${videoId}`, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost
      }
    });

    if (!response.ok) {
       const errorText = await response.text();
       // Try to parse JSON for a more specific message, otherwise use the text
       try {
         const errorJson = JSON.parse(errorText);
         throw new Error(errorJson.message || 'Failed to fetch transcript from API.');
       } catch {
         throw new Error(`API Error: ${errorText}`);
       }
    }

    const transcriptParts = await response.json();
    const transcriptText = transcriptParts.map((part: { text: string }) => part.text).join(' ');
    
    if (!transcriptText) {
      throw new Error('This video does not have captions available.');
    }

    // --- END OF NEW LOGIC ---


    // The rest of the function remains the same
    const finalInsights = await summarizeTextWithGemini(transcriptText);

    // Get the video title from the API response if available
    const videoTitle = transcriptParts[0]?.video_title || 'Note from YouTube Video';

    const noteContent = `
# Summary
${finalInsights.summary}

## Action Items
${finalInsights.action_items.map((item: string) => `- [ ] ${item}`).join('\n')}

## Key Decisions
${finalInsights.key_decisions.map((item: string) => `- ${item}`).join('\n')}
`;

    const { data: newNote, error: insertError } = await supabaseAdmin
      .from('notes')
      .insert({
        user_id: userId,
        title: videoTitle,
        content: noteContent,
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`DB insert failed: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ newNoteId: newNote.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in summarize-youtube-video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})