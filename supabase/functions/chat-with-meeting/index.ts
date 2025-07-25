import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId, userQuestion } = await req.json();
    if (!meetingId || !userQuestion) {
      throw new Error('Meeting ID and user question are required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('transcript')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting || !meeting.transcript) {
      throw new Error('Transcript not found for this meeting.');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('Gemini API key not set.');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a helpful AI assistant. Based ONLY on the provided meeting transcript, answer the user's question. If the answer is not in the transcript, state that clearly.

Transcript:
---
${meeting.transcript}
---

User Question: ${userQuestion}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});