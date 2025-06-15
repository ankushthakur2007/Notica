# Notica: Speak. Refine. Remember.

Notica is a voice-based, AI-powered note-taking application designed to help you capture thoughts quickly and transform them into beautifully structured notes.

## Features (Planned)

-   **User Authentication:** Secure Google Sign-In via Supabase Auth.
-   **Voice to Text Input:** Record voice notes with Deepgram API (and Web Speech API fallback).
-   **AI-Generated Notes:** Transform raw transcriptions into structured, readable notes using Gemini Pro API.
-   **Rich Text Editor:** Edit and enhance notes with TipTap, including image uploads to Supabase Storage.
-   **Exporting Options:** Export notes as PDF, DOCX, or plain text.
-   **Note Management:** Dashboard with note previews, search, and filtering.
-   **Mobile Responsive & Dark Mode:** Seamless experience across devices with theme toggling.

## Tech Stack

-   **Frontend:** React, TypeScript, Tailwind CSS, React Router, Shadcn/ui, TipTap
-   **Backend:** Supabase (Auth, Database, Storage)
-   **AI:** Google Gemini Pro API
-   **Speech-to-Text:** Deepgram API, Web Speech API (fallback)
-   **Exporting:** jsPDF, html-docx-js
-   **Hosting:** Vercel (planned)

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
3.  **Set up Supabase:**
    -   Create a new project on Supabase.
    -   Copy your Supabase Project URL and Anon Key.
    -   Set up Google authentication in your Supabase project.
    -   Create a `.env.local` file in the root of your project and add:
        ```
        VITE_SUPABASE_URL=YOUR_SUPABASE_URL
        VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
        ```
4.  **Run the application:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:8080`.

## Usage

(To be updated as features are implemented)

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

## Credits

-   Built with Dyad.sh