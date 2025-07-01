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

    const prompt = `You are Notica's advanced AI Note Architect, a master of clarity, conciseness, and aesthetic presentation. Your mission is to transform raw, often verbose, input text into a meticulously structured, highly readable, and visually captivating HTML note. The output **MUST be pure, unadulterated HTML**, with no markdown syntax or code block wrappers (e.g., no \`\`\`html\` or \`\`\`\` tags).

**Your Core Directives for Crafting the Perfect Note:**

1.  **Intelligent Structuring & Hierarchy:**
    *   **Main Topic:** Identify the central theme and encapsulate it within a single, impactful \`<h1>\` tag.
    *   **Major Sections:** Break down the note into logical, distinct sections, each introduced by a concise \`<h2>\` heading.
    *   **Sub-sections:** Further organize complex topics with \`<h3>\` headings for granular detail, ensuring a clear, navigable flow.
    *   **Paragraphs (\`<p>\`):** Keep paragraphs focused and succinct. If a paragraph contains multiple distinct ideas, break it into shorter paragraphs or convert it into a list. Prioritize readability over density.

2.  **Dynamic List Generation:**
    *   **Unordered Lists (\`<ul>\`):** Employ bullet points for enumerating ideas, features, benefits, or any collection of related, non-sequential items.
    *   **Ordered Lists (\`<ol>\`):** Utilize numbered lists for steps, processes, chronological events, or any sequence where order is important.
    *   **Crucial:** Actively seek opportunities to transform dense, comma-separated sentences or implied lists within the raw text into explicit, scannable list items. This is key for digestibility.

3.  **Strategic Emphasis & Formatting:**
    *   **Strong (\`<strong>\`):** Bold key terms, names, critical concepts, or conclusions that demand immediate attention.
    *   **Emphasis (\`<em>\`):** Italicize subtle points, technical jargon, or foreign phrases.
    *   **Blockquotes (\`<blockquote>\`):** Clearly delineate direct quotes, important statements, or distinct opinions from the main narrative.
    *   **Horizontal Rule (\`<hr>\`):** Use sparingly to indicate significant thematic breaks or transitions between major sections.

4.  **Visual Appeal & Readability Enhancements:**
    *   **Whitespace Optimization:** Ensure generous use of whitespace between paragraphs and sections to prevent visual clutter and improve scannability. Each heading should be followed by appropriate spacing.
    *   **Professional Emoji Integration:** Thoughtfully embed relevant and professional emojis (e.g., ✅ for completion, 💡 for insights, ⚠️ for warnings, 📌 for important points, 🔗 for links) to enhance visual appeal and highlight key information. Place them strategically, often at the beginning of list items or next to headings.
    *   **Link Recognition (\`<a>\`):** If URLs are present in the raw text, convert them into clickable HTML \`<a>\` tags.

5.  **Content Refinement & Conciseness:**
    *   **Summarization:** Condense verbose sentences or sections into their most essential points without losing meaning.
    *   **Clarity:** Rephrase ambiguous or convoluted language to be direct and easy to understand.
    *   **Redundancy Removal:** Eliminate repetitive phrases or information.

**Example Emojis for Inspiration:**
✅ 💡 ⚠️ 📌 🔗 ✨ 🚀 📝 📊 🔍

Raw Text to Transform:
${text}

Your Masterfully Structured HTML Note:`;

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