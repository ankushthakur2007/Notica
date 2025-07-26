import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { YoutubeTranscript } from "https://esm.sh/youtube-transcript@1.0.6";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Start of inlined summarizer logic ---
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
// --- End of inlined summarizer logic ---

// Helper to format insights into HTML
function formatInsightsToHtml(insights: any, videoTitle: string): string {
  let html = `<h1>${videoTitle}</h1>`;
  if (insights.summary) {
    html += `<h2>Summary</h2><p>${insights.summary}</p>`;
  }
  if (insights.action_items && insights.action_items.length > 0) {
    html += `<h2>Action Items</h2><ul>`;
    insights.action_items.forEach((item: string) => {
      html += `<li>${item}</li>`;
    });
    html += `</ul>`;
  }
  if (insights.key_decisions && insights.key_decisions.length > 0) {
    html += `<h2>Key Decisions</h2><ul>`;
    insights.key_decisions.forEach((item: string) => {
      html += `<li>${item}</li>`;
    });
    html += `</ul>`;
  }
  return html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { youtubeUrl, userId } = await req.json();

  try {
    if (!youtubeUrl || !userId) {
      throw new Error('youtubeUrl and userId are required.');
    }

    // 1. Fetch transcript with improved error handling
    let transcriptParts;
    try {
      transcriptParts = await YoutubeTranscript.fetchTranscript(youtubeUrl);
    } catch (transcriptError) {
      console.error(`youtube-transcript library failed for URL: ${youtubeUrl}`, transcriptError);
      throw new Error("Failed to fetch transcript. The video may not have one, or it might be private or region-locked.");
    }
    
    if (!transcriptParts || transcriptParts.length === 0) {
      throw new Error('Could not fetch transcript for this video. It might be disabled by the creator.');
    }
    const transcriptText = transcriptParts.map(part => part.text).join(' ');

    // 2. Summarize transcript
    const insights = await summarizeTextWithGemini(transcriptText);

    // 3. Create new note in DB
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch video title
    let videoTitle = "Note from YouTube";
    try {
        const videoPageResponse = await fetch(youtubeUrl);
        const videoPageText = await videoPageResponse.text();
        const titleMatch = videoPageText.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
            videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
        }
    } catch (e) {
        console.warn(`Could not fetch video title for ${youtubeUrl}, using default.`);
    }

    const noteContent = formatInsightsToHtml(insights, videoTitle);

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
      throw new Error(`Failed to save note: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ noteId: newNote.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Add more detailed logging for any error that occurs
    console.error(`Error in summarize-youtube-video for URL ${youtubeUrl}:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});