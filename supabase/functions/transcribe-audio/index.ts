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
      throw new Error('Deepgram API key not set in environment variables.');
    }

    const formData = await req.formData();
    const audioBlob = formData.get('audio') as Blob;
    const language = formData.get('language') as string || 'en';

    if (!audioBlob) {
      throw new Error('Audio blob not found in request.');
    }

    const dgUrl = new URL('https://api.deepgram.com/v1/listen');
    dgUrl.searchParams.append('punctuate', 'true');
    dgUrl.searchParams.append('model', 'nova-2');
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
        'Content-Type': audioBlob.type,
      },
      body: audioBlob,
    });

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

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});