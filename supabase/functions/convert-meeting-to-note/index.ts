import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not set in environment variables.');
    }

    const { summary, action_items, key_decisions } = await req.json();
    if (!summary) {
      throw new Error('Meeting insights are required for conversion.');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construct a detailed text block from the insights
    let inputText = `Summary:\n${summary}\n\n`;
    if (action_items && action_items.length > 0) {
      inputText += `Action Items:\n- ${action_items.join('\n- ')}\n\n`;
    }
    if (key_decisions && key_decisions.length > 0) {
      inputText += `Key Decisions:\n- ${key_decisions.join('\n- ')}`;
    }

    const prompt = `You are an expert note-taker. Convert the following meeting insights (summary, action items, key decisions) into a well-structured and readable HTML note.

**Formatting Rules:**
- Use an \`<h2>\` tag for each section heading (e.g., "Summary", "Action Items", "Key Decisions").
- Use a \`<p>\` tag for the summary text.
- Use an unordered list (\`<ul>\` and \`<li>\`) for action items and key decisions.
- Use \`<strong>\` tags to emphasize important keywords or phrases.
- The output MUST be pure HTML, without any markdown or code block wrappers.

**Meeting Insights to Convert:**
---
${inputText}
---

**Your Structured HTML Note:**`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let generatedContent = response.text();

    // Clean up potential markdown wrappers
    generatedContent = generatedContent.replace(/^```html\s*/, '').replace(/\s*```$/, '');

    return new Response(JSON.stringify({ generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in convert-meeting-to-note Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});