import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Start of Embedded Shared Code ---
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const words = text.split(' ');
  if (words.length <= chunkSize) {
    return [text];
  }

  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

async function summarizeTextWithGemini(transcriptText: string) {
  if (!transcriptText) {
    throw new Error('Transcript text is empty or in an invalid format.');
  }

  const textChunks = chunkText(transcriptText, 2000, 200);

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not set.');
  }
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const chunkSummaries = await Promise.all(
    textChunks.map(async (chunk) => {
      const prompt = `You are an expert meeting analyst. This is one chunk of a larger meeting transcript. Your task is to extract the key points, any decisions made, and any action items mentioned ONLY within this text. Be concise.

      Transcript Chunk:
      ---
      ${chunk}
      ---

      Summary of this chunk:`;
      const result = await model.generateContent(prompt);
      return result.response.text();
    })
  );

  const combinedSummaries = chunkSummaries.join('\n---\n');
  const finalPrompt = `You are an expert meeting analyst. You will be given a series of summaries from sequential chunks of a single meeting. Your task is to synthesize all of this information into a single, cohesive final output.

  Generate a JSON object with three keys: "summary" (a brief, overall summary of the entire meeting), "action_items" (an array of strings, each being a clear, actionable task), and "key_decisions" (an array of strings, each being a significant decision made). Respond with ONLY the raw JSON object, without any markdown formatting like \`\`\`json.

  Summaries from meeting chunks:
  ---
  ${combinedSummaries}
  ---

  Final JSON Output:`;

  const finalResult = await model.generateContent(finalPrompt);
  let finalJsonText = finalResult.response.text().trim();
  if (finalJsonText.startsWith('```json')) {
    finalJsonText = finalJsonText.slice(7, -3).trim();
  }
  
  return JSON.parse(finalJsonText);
}
// --- End of Embedded Shared Code ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { meetingId } = await req.json()

  if (!meetingId) {
    return new Response(JSON.stringify({ error: 'meetingId is required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }

  try {
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('transcript')
      .eq('id', meetingId)
      .single()

    if (fetchError || !meeting) {
      throw new Error(`Meeting not found: ${fetchError?.message}`)
    }

    const transcriptJson = meeting.transcript as any
    const transcriptText = transcriptJson?.results?.channels[0]?.alternatives[0]?.transcript || ''

    // Use the embedded summarizer function
    const finalInsights = await summarizeTextWithGemini(transcriptText);

    await supabaseAdmin
      .from('meetings')
      .update({
        summary: finalInsights.summary,
        action_items: finalInsights.action_items,
        key_decisions: finalInsights.key_decisions,
        status: 'completed',
      })
      .eq('id', meetingId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`Error in generate-insights for meetingId ${meetingId}:`, error)
    await supabaseAdmin
      .from('meetings')
      .update({ status: 'failed' })
      .eq('id', meetingId)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})