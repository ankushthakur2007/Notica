import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY is not set in environment variables.');
      return new Response(JSON.stringify({ error: 'Deepgram API key not set in environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('DEEPGRAM_API_KEY is set.');

    const audioBlob = await req.blob();
    console.log('Received audio blob. Type:', audioBlob.type, 'Size:', audioBlob.size, 'bytes');

    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen?punctuate=true&model=nova-2', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': audioBlob.type, // Ensure content type matches the blob
      },
      body: audioBlob,
    });

    console.log('Deepgram API response status:', deepgramResponse.status, deepgramResponse.statusText);

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('Deepgram API error:', deepgramResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Deepgram API error', details: errorText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: deepgramResponse.status,
      });
    }

    const deepgramData = await deepgramResponse.json();
    const transcription = deepgramData.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    console.log('Deepgram transcription received. Length:', transcription.length, 'Transcription snippet:', transcription.substring(0, 100) + '...');

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in Edge Function (transcribe-audio):', error.message, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});