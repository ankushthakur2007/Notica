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

## Credits

-   Built with Dyad.sh