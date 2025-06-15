# Notica Project Plan

This document outlines the features, current status, and future enhancements for the Notica application.

## Feature Checklist

-   [ ] **User Authentication**
    -   [ ] Supabase Auth integration
    -   [ ] Google Sign-In
    -   [ ] Private notes (user-specific access)
    -   [ ] Protected routes
-   [ ] **Voice to Text Input**
    -   [ ] Browser-based voice recording
    -   [ ] Deepgram API integration for speech-to-text
    -   [ ] Web Speech API fallback
-   [ ] **AI-Generated Beautiful Notes**
    -   [ ] Send transcribed text to Gemini Pro API
    -   [ ] Gemini prompt for structured notes (paragraphs, bullet points, emojis, headings)
    -   [ ] Output formatting (Markdown/HTML)
-   [ ] **Rich Text Editor (TipTap)**
    -   [ ] Display AI-generated notes in TipTap editor
    -   [ ] Free text editing
    -   [ ] Link pasting
    -   [ ] Image upload and insertion (Supabase Storage)
    -   [ ] Emoji and formatting options
    -   [ ] Autosave/Manual save to Supabase Database
-   [ ] **Exporting Options**
    -   [ ] Export as PDF (jsPDF)
    -   [ ] Export as DOCX (html-docx-js)
    -   [ ] Export as Plain text
    -   [ ] Copy to clipboard
-   [ ] **Note Management**
    -   [ ] Dashboard displaying all user notes
    -   [ ] Title preview
    -   [ ] Created and updated date display
    -   [ ] Search bar
    -   [ ] Filter by tags (optional)
    -   [ ] Delete notes
    -   [ ] Rename notes
-   [ ] **User Interface**
    -   [ ] Mobile Responsive design
    -   [ ] Dark/Light mode toggle
    -   [ ] Clean and modern UI (Notion/Apple Notes inspired)

## Bugs & Enhancements

-   [ ] Implement robust error handling for API calls.
-   [ ] Add loading states for AI processing and data fetching.
-   [ ] Improve UI/UX for recording and editing.

## Future Features

-   [ ] AI tagging for notes.
-   [ ] AI summarization of notes.
-   [ ] Folder organization for notes.
-   [ ] Sharing notes with other users.
-   [ ] Real-time collaboration on notes.
-   [ ] Integration with calendar/reminders.