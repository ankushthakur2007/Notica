import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { YoutubeTranscript } from "https://esm.sh/youtube-transcript@1.0.6";
import { summarizeTextWithGemini } from '../_shared/summarizer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

  try {
    const { youtubeUrl, userId } = await req.json();
    if (!youtubeUrl || !userId) {
      throw new Error('youtubeUrl and userId are required.');
    }

    // 1. Fetch transcript
    const transcriptParts = await YoutubeTranscript.fetchTranscript(youtubeUrl);
    if (!transcriptParts || transcriptParts.length === 0) {
      throw new Error('Could not fetch transcript for this video. It might be disabled.');
    }
    const transcriptText = transcriptParts.map(part => part.text).join(' ');

    // 2. Summarize transcript
    const insights = await summarizeTextWithGemini(transcriptText);

    // 3. Create new note in DB
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch video title by parsing the video page's HTML
    let videoTitle = "Note from YouTube";
    try {
        const videoPageResponse = await fetch(youtubeUrl);
        const videoPageText = await videoPageResponse.text();
        const titleMatch = videoPageText.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
            videoTitle = titleMatch[1].replace(' - YouTube', '').trim();
        }
    } catch (e) {
        console.warn("Could not fetch video title, using default.");
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});