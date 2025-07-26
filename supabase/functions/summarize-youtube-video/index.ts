import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Start of Custom Transcript Fetcher ---
async function getTranscript(url: string): Promise<string> {
  const videoPageResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  if (!videoPageResponse.ok) {
    throw new Error(`Failed to fetch YouTube page: ${videoPageResponse.statusText}`);
  }
  const videoPageText = await videoPageResponse.text();

  const playerResponseRegex = /var ytInitialPlayerResponse = ({.*?});/;
  const match = videoPageText.match(playerResponseRegex);
  if (!match || !match[1]) {
    throw new Error('Could not find player response in YouTube page. The page structure may have changed or transcripts are not available.');
  }

  const playerResponse = JSON.parse(match[1]);
  const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No caption tracks found for this video. Transcripts may be disabled by the creator.');
  }

  const transcriptTrack = captionTracks.find((track: any) => track.vssId.startsWith('.')) || captionTracks[0];
  const transcriptUrl = transcriptTrack.baseUrl;

  const transcriptXmlResponse = await fetch(transcriptUrl);
  if (!transcriptXmlResponse.ok) {
    throw new Error(`Failed to fetch transcript XML: ${transcriptXmlResponse.statusText}`);
  }
  const transcriptXmlText = await transcriptXmlResponse.text();

  const textParts = [...transcriptXmlText.matchAll(/<text.*?>(.*?)<\/text>/gs)].map(part => part[1]);
  
  const decodedParts = textParts.map(part => 
    part.replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
  );

  return decodedParts.join(' ');
}
// --- End of Custom Transcript Fetcher ---

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
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { youtubeUrl, userId } = await req.json();
    if (!youtubeUrl || !userId) {
      throw new Error('youtubeUrl and userId are required.');
    }

    let transcriptText;
    try {
      transcriptText = await getTranscript(youtubeUrl);
    } catch (e) {
      if (e.message.includes('No caption tracks found') || e.message.includes('transcripts are not available')) {
        return new Response(JSON.stringify({ error: 'No transcript available for this video. Please try another.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      throw e; // Re-throw other errors
    }

    if (!transcriptText) {
      throw new Error('Could not fetch transcript for this video.');
    }

    const insights = await summarizeTextWithGemini(transcriptText);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let videoTitle = "Note from YouTube";
    try {
        const videoPageResponse = await fetch(youtubeUrl);
        const pageText = await videoPageResponse.text();
        const titleMatch = pageText.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
            videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
        }
    } catch (e) {
        console.warn(`Could not fetch video title for ${youtubeUrl}, using default.`);
    }

    const noteContent = formatInsightsToHtml(insights, videoTitle);

    const { data: newNote, error: insertError } = await supabaseAdmin
      .from('notes')
      .insert({ user_id: userId, title: videoTitle, content: noteContent })
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error in summarize-youtube-video:`, error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});