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

    const prompt = `Analyze the following meeting transcript and extract a concise summary, a list of action items, and a list of key decisions. Respond with ONLY a valid JSON object with the keys "summary" (string), "action_items" (array of strings), and "key_decisions" (array of strings).

Transcript:
---
${meeting.transcript}
---`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawJson = response.text();
    
    rawJson = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');

    const insights = JSON.parse(rawJson);

    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({
        summary: insights.summary,
        action_items: insights.action_items,
        key_decisions: insights.key_decisions,
        status: 'completed',
      })
      .eq('id', meetingId);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

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