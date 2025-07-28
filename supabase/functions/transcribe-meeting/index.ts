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
    const language = body.language || 'en';
    if (!meetingId) throw new Error('Meeting ID is required.');

    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('audio_url')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting || !meeting.audio_url) throw new Error('Meeting audio URL not found.');

    const urlParts = meeting.audio_url.split('/meeting-recordings/');
    if (urlParts.length < 2) {
      throw new Error('Invalid audio URL format. Cannot extract path.');
    }
    const filePath = urlParts[1];

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('meeting-recordings')
      .createSignedUrl(filePath, 60);

    if (signedUrlError) {
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }
    const signedUrl = signedUrlData.signedUrl;

    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramApiKey) throw new Error('Deepgram API key not set.');

    const dgUrl = new URL('https://api.deepgram.com/v1/listen');
    dgUrl.searchParams.append('model', 'nova-2-meeting');
    dgUrl.searchParams.append('utterances', 'true');
    dgUrl.searchParams.append('diarize', 'true');
    dgUrl.searchParams.append('smart_format', 'true');
    dgUrl.searchParams.append('language', language);

    // Add keyword boosting for Hinglish to improve accuracy
    if (language === 'en-IN') {
      const hinglishKeywords = [
        'aur', 'bhi', 'bahut', 'chalo', 'dost', 'ghar', 'hai', 'haan', 'kaise', 
        'kya', 'kahan', 'kab', 'kyun', 'lekin', 'matlab', 'nahi', 'paisa', 
        'yaar', 'theek', 'toh', 'bilkul', 'baat', 'karo', 'kaam', 'bohot'
      ];
      hinglishKeywords.forEach(k => dgUrl.searchParams.append('keywords', k));
    }

    const deepgramResponse = await fetch(dgUrl.toString(), {
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