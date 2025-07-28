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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  let meetingId;

  try {
    const body = await req.json();
    meetingId = body.meetingId;
    if (!meetingId) throw new Error('Meeting ID is required.');

    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('audio_url')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting || !meeting.audio_url) throw new Error('Meeting audio URL not found.');

    // Parse the file path from the full public URL stored in the database.
    const urlParts = meeting.audio_url.split('/meeting-recordings/');
    if (urlParts.length < 2) {
      throw new Error('Invalid audio URL format. Cannot extract path.');
    }
    const filePath = urlParts[1];

    // Create a temporary signed URL that expires in 60 seconds.
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('meeting-recordings')
      .createSignedUrl(filePath, 60); // Expires in 60 seconds

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }
    const signedUrl = signedUrlData.signedUrl;

    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramApiKey) throw new Error('Deepgram API key not set.');

    const url = new URL('https://api.deepgram.com/v1/listen');
    url.searchParams.append('model', 'nova-2-meeting');
    url.searchParams.append('utterances', 'true');
    url.searchParams.append('diarize', 'true');
    url.searchParams.append('smart_format', 'true');
    url.searchParams.append('detect_language', 'true'); // Enabled multi-language support

    // Send the temporary signed URL to Deepgram.
    const deepgramResponse = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: signedUrl }),
    });

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      throw new Error(`Deepgram API error: ${errorText}`);
    }

    const deepgramData = await deepgramResponse.json();

    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({ transcript: deepgramData, status: 'analyzing' })
      .eq('id', meetingId);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    const { error: invokeError } = await supabaseAdmin.functions.invoke('generate-insights', {
      body: { meetingId },
    });

    if (invokeError) throw new Error(`Failed to invoke generate-insights: ${invokeError.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    if (meetingId) {
      await supabaseAdmin.from('meetings').update({ status: 'failed' }).eq('id', meetingId);
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});