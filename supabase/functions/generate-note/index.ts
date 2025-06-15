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
    console.log('GEMINI_API_KEY is set.');

    const { text } = await req.json();
    if (!text) {
      console.error('No text provided in the request body.');
      return new Response(JSON.stringify({ error: 'No text provided for generation.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    console.log('Received text for AI refinement. Length:', text.length, 'Text snippet:', text.substring(0, 100) + '...');

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a helpful note-taking assistant. Take the following raw text and transform it into a well-structured, readable note. Use headings, bullet points, and paragraphs where appropriate. You can also add relevant emojis to make it more engaging. The output should be in HTML format suitable for a rich text editor.

Raw Text:
${text}

Structured Note (HTML):`;

    console.log('Sending prompt to Gemini API. Prompt length:', prompt.length, 'Prompt snippet:', prompt.substring(0, 200) + '...');
    const result = await model.generateContent(prompt);
    console.log('Received raw response from Gemini API:', JSON.stringify(result, null, 2));

    const response = await result.response;
    const generatedContent = response.text();
    console.log('Generated content length:', generatedContent.length, 'Content snippet:', generatedContent.substring(0, 100) + '...');

    return new Response(JSON.stringify({ generatedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error in Edge Function (generate-note):', error.message, error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});