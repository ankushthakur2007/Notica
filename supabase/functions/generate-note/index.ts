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
      console.error('GEMINI_API_KEY is not set in environment variables.');
      return new Response(JSON.stringify({ error: 'Gemini API key not set in environment variables.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    console.log('GEMINI_API_KEY is set.'); // Log that key is present (without logging the key itself)

    const { text } = await req.json();
    if (!text) {
      console.error('No text provided in the request body.');
      return new Response(JSON.stringify({ error: 'No text provided for generation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log('Received text for AI refinement. Length:', text.length);

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an expert note-taking assistant. Your task is to transform raw, unstructured text into a highly readable, aesthetically pleasing, and ergonomically optimized note. The output MUST be pure, raw HTML, without any markdown code block wrappers (e.g., no \`\`\`html or \`\`\` tags).

Follow these guidelines for structuring the note:
1.  **Clear Hierarchy:** Use <h1> for the main title (if applicable), <h2> for major sections, and <h3> for sub-sections.
2.  **Lists for Clarity:** Always use <ul> for bullet points and <ol> for numbered lists when presenting multiple items, steps, or key takeaways.
3.  **Emphasis:** Use <strong> for important terms, keywords, or strong statements. Use <em> for emphasis or to highlight specific phrases.
4.  **Quotes:** Use <blockquote> for any quoted text or distinct statements.
5.  **Paragraphs:** Use <p> tags for general text flow.
6.  **Emojis:** Incorporate relevant and tasteful emojis to enhance engagement and clarity, placing them strategically (e.g., at the start of list items, next to headings).
7.  **Flow and Scannability:** Ensure the note flows logically, is easy to scan, and highlights key information effectively. Break down dense paragraphs into shorter ones or lists.

Raw Text:
${text}

Structured Note (HTML):`;

    console.log('Sending prompt to Gemini API...');
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini API.');

    const response = await result.response;
    let generatedContent = response.text();
    console.log('Raw generated content length:', generatedContent.length);

    // Post-process to remove markdown code block wrappers if they still appear
    generatedContent = generatedContent.replace(/^```html\s*/, '').replace(/\s*```$/, '');
    console.log('Cleaned generated content length:', generatedContent.length);

    return new Response(JSON.stringify({ generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in Edge Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});