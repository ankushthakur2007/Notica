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
  
  try {
    return JSON.parse(finalJsonText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON response:", finalJsonText);
    throw new Error("AI failed to generate a valid JSON response.");
  }
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

  try {
    const { youtubeUrl, userId } = await req.json();
    if (!youtubeUrl || !userId) {
      throw new Error('youtubeUrl and userId are required.');
    }

    // 1. Extract Video ID from various YouTube URL formats
    const url = new URL(youtubeUrl);
    let videoId = url.searchParams.get('v');
    if (!videoId) {
      if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1);
      }
    }

    if (!videoId) {
      throw new Error('Invalid YouTube URL. Could not find Video ID.');
    }

    // 2. Call the reliable RapidAPI endpoint with the lang parameter
    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    const rapidApiHost = Deno.env.get('RAPIDAPI_HOST');
    
    if (!rapidApiKey || !rapidApiHost) {
        throw new Error('RapidAPI credentials are not set in environment variables.');
    }
    
    const response = await fetch(`https://${rapidApiHost}/transcript?video_id=${videoId}&lang=en`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': rapidApiHost
      }
    });

    if (!response.ok) {
       const errorText = await response.text();
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

    const finalInsights = await summarizeTextWithGemini(transcriptText);

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