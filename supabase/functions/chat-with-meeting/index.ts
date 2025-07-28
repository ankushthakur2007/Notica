import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

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

    // Fetch both transcript and the existing chat history
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('transcript, chat_history')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      throw new Error(`Meeting not found or failed to fetch: ${fetchError?.message}`);
    }

    const transcriptText = meeting.transcript?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    if (!transcriptText) {
      throw new Error('Could not extract plain text from transcript object.');
    }
    
    const existingHistory: Message[] = meeting.chat_history || [];

    // Generate AI response
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('Gemini API key not set.');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a helpful AI assistant. Based ONLY on the provided meeting transcript, answer the user's question. If the answer is not in the transcript, state that clearly.

Transcript:
---
${transcriptText}
---

User Question: ${userQuestion}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    // Prepare the new history and save it to the database
    const userMessage: Message = { sender: 'user', text: userQuestion };
    const aiMessage: Message = { sender: 'ai', text: answer };
    const newHistory = [...existingHistory, userMessage, aiMessage];

    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({ chat_history: newHistory })
      .eq('id', meetingId);

    if (updateError) {
      // Log the error, but still return the answer to the user
      console.error('Failed to save chat history:', updateError.message);
    }

    // Return only the new answer to the client
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