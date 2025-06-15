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

    const prompt = `You are a highly skilled and meticulous note-taking AI. Your primary objective is to transform raw, unstructured text into a perfectly formatted, easy-to-digest, and visually appealing HTML note. The output MUST be pure, raw HTML, without any markdown code block wrappers (e.g., no \`\`\`html or \`\`\` tags).

Follow these strict guidelines for structuring the note:
1.  **Clear Hierarchy:** Use <h1> for the main topic or title, <h2> for major sections, and <h3> for sub-sections. Ensure a logical and consistent flow of headings.
2.  **Intelligent List Usage:** Crucially, identify opportunities to convert dense information into lists. Use <ul> for bullet points (unordered items) and <ol> for numbered steps, sequences, or ordered items. Break down complex sentences or multiple distinct ideas into concise list items for enhanced scannability. You have the discretion to choose between bullet points and numbering based on the content's nature.
3.  **Emphasis:** Apply <strong> for critical keywords, names, or concepts that demand immediate attention. Use <em> for subtle emphasis or technical terms.
4.  **Quotes:** Use <blockquote> for any quoted text or distinct, important statements.
5.  **Paragraphs & Spacing:** Use <p> tags for general text flow. Keep paragraphs concise and focused; break long paragraphs into shorter ones or convert them into lists if they contain several points. Ensure ample whitespace and clear visual breaks between different sections and paragraphs to prevent a cluttered appearance.
6.  **Emojis:** Integrate relevant and professional emojis sparingly to enhance readability and highlight key points (e.g., ✅ for completed items, 💡 for ideas, ⚠️ for warnings, 📌 for important notes). Place them strategically, often at the start of list items or next to headings.
7.  **Flow and Scannability:** The entire note should be highly scannable, with clear visual breaks, ample whitespace, and a logical progression of information. Prioritize clarity, conciseness, and an intuitive reading experience.

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