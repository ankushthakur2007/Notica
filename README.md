# Notica: Speak. Refine. Remember.

Notica is a voice-based, AI-powered note-taking application designed to help you capture thoughts quickly and transform them into beautifully structured notes.

## What is Notica?

Notica is an innovative note-taking application that bridges the gap between spoken ideas and organized, actionable insights. It's designed for anyone who wants to capture thoughts on the go, streamline their note-taking process, and leverage the power of AI to create polished, professional notes effortlessly. From brainstorming sessions to lecture summaries, Notica ensures your ideas are not just recorded, but truly refined.

## Why Notica is Better?

In a crowded market of note-taking apps, Notica stands out by offering a unique, integrated experience:

*   **Seamless Voice-to-AI Workflow:** Unlike traditional apps that require manual typing or offer basic transcription, Notica provides a direct pipeline from your voice to an AI-structured note. Speak naturally, and let our AI do the heavy lifting of organization and formatting.
*   **Intelligent AI Refinement:** We don't just transcribe; we transform. Our integration with Google Gemini Pro means your raw voice notes are intelligently structured with headings, bullet points, and even relevant emojis, making them instantly readable and visually appealing.
*   **Comprehensive Editing & Management:** Beyond AI, Notica offers a robust rich text editor (TipTap) for fine-tuning your notes, adding images, and ensuring every detail is perfect. Coupled with powerful note management features like search, filtering, and easy export options, your notes are always at your fingertips.
*   **Privacy-First Approach:** Built on Supabase, Notica prioritizes your data security and privacy. We only request essential permissions and clearly outline our data handling practices in our transparent Privacy Policy.

## What Makes Notica Special?

Notica's true magic lies in its ability to turn fleeting thoughts into lasting, organized knowledge with minimal effort:

*   **Effortless Capture:** Simply speak your mind. Whether you're walking, driving, or in a meeting, Notica captures your ideas without the need for typing.
*   **Instant Organization:** Say goodbye to messy, unformatted notes. Our AI instantly structures your content, saving you valuable time on editing and formatting.
*   **Visually Engaging Notes:** With AI-driven formatting and strategic emoji integration, your notes aren't just functional; they're a pleasure to read and review.
*   **Secure & Scalable:** Leveraging Supabase, Notica offers reliable authentication, secure data storage, and the flexibility to grow with your needs.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd notica
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up Supabase Environment Variables (Local Development):**
    -   Create a `.env.local` file in the **root** of your project (the same directory as `package.json`).
    -   Add the following content to `.env.local`:
        ```
        VITE_SUPABASE_URL=https://yibrrjblxuoebnecbntp.supabase.co
        VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYnJyamJseHVvZWJuZWNibnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTg2NzksImV4cCI6MjA2NTM3NDY3OX0.fl0Z5vt9wT4BwcGdIm-VW4Pm6AxjxYsNBm2TB2oP4tU
        ```
    -   **Important:** This file is for local development only and should not be committed to Git. It's already ignored by default in `.gitignore`.
4.  **Run the application:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:8080`.

## Deployment

To deploy your Notica application, especially to platforms like Vercel, you'll need to configure environment variables for both your frontend and your Supabase Edge Functions.

### 1. Frontend Environment Variables (for Vercel/Netlify/etc.)

These variables are used by your React application to connect to Supabase. You should set these in your hosting provider's environment variable settings (e.g., Vercel Project Settings > Environment Variables).

-   `VITE_SUPABASE_URL`: Your Supabase Project URL.
-   `VITE_SUPABASE_ANON_KEY`: Your Supabase Project Anon (Public) Key.

### 2. Supabase Edge Function Secrets (for Supabase)

These secrets are used by your deployed Supabase Edge Functions (`transcribe-audio`, `generate-note`, `search-users`). You must set these directly within your Supabase project settings.

1.  Go to your Supabase project dashboard.
2.  Navigate to **Edge Functions** in the sidebar.
3.  Click on **Manage Secrets**.
4.  Add the following secrets:
    -   `DEEPGRAM_API_KEY`: Your Deepgram API Key for voice-to-text transcription.
    -   `GEMINI_API_KEY`: Your Google Gemini Pro API Key for AI note generation.
    -   `SUPABASE_URL`: Your Supabase Project URL (same as `VITE_SUPABASE_URL`).
    -   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Project Service Role Key (found under Project Settings > API). **Keep this key secure and never expose it on the client-side.**

### 3. Deploying to Vercel

1.  **Connect your Git Repository**: In Vercel, import your Git repository (e.g., GitHub, GitLab, Bitbucket).
2.  **Configure Project**:
    *   **Framework Preset**: Select "Vite".
    *   **Root Directory**: Ensure it's set correctly if your project is in a monorepo (otherwise, leave as default).
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3.  **Environment Variables**: Add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the "Environment Variables" section of your Vercel project settings.
4.  **Deploy**: Click "Deploy". Vercel will automatically build and deploy your frontend application.

Your Supabase Edge Functions are automatically deployed when you make changes to the `supabase/functions` directory and approve them in Dyad, or when you deploy them manually via the Supabase CLI. Ensure the secrets mentioned above are set in your Supabase project for the functions to work correctly.