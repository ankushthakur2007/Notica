import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="w-full max-w-3xl bg-card rounded-lg shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-primary">Privacy Policy</h1>
        <p className="text-muted-foreground">
          This Privacy Policy describes how Notica collects, uses, and discloses your information when you use our service.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
        <p className="text-muted-foreground">
          We collect information you provide directly to us, such as your name, email address, and profile picture when you register for an account.
          We also collect content you create, such as your notes and voice recordings.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">
          We use the information we collect to provide, maintain, and improve our services,
          to process your voice-to-text transcriptions and AI-generated notes, and to personalize your experience.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">3. Sharing Your Information</h2>
        <p className="text-muted-foreground">
          We do not share your personal information with third parties except as necessary to provide our services (e.g., with Supabase for authentication and storage, Deepgram for transcription, and Google Gemini for AI processing)
          or when required by law.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
        <p className="text-muted-foreground">
          We implement reasonable security measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">5. Your Choices</h2>
        <p className="text-muted-foreground">
          You can review and update your profile information through the settings page. You can also delete your notes at any time.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">6. Changes to This Policy</h2>
        <p className="text-muted-foreground">
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">7. Contact Us</h2>
        <p className="text-muted-foreground">
          If you have any questions about this Privacy Policy, please contact us.
        </p>

        <div className="flex justify-center mt-8">
          <Button asChild>
            <Link to="/dashboard/all-notes">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;