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
          By using Notica, you agree to the collection and use of information in accordance with this policy.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
        <p className="text-muted-foreground">
          We collect information you provide directly to us when you create an account or use our services. This includes:
        </p>
        <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
          <li><strong>Account Information:</strong> Your email address, first name, last name, and profile picture (if provided) when you register via Google Sign-In or other methods. This data is managed through Supabase Auth.</li>
          <li><strong>Note Content:</strong> The text content of your notes, including any voice transcriptions and AI-generated refinements. This content is stored in our Supabase Database.</li>
          <li><strong>Voice Recordings:</strong> Audio data from your voice notes, which is temporarily processed by Deepgram for transcription. We do not store raw audio recordings after transcription.</li>
          <li><strong>Images:</strong> Images you upload to your notes, which are stored in Supabase Storage.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground">2. How We Use Your Information</h2>
        <p className="text-muted-foreground">
          We use the information we collect for the following purposes:
        </p>
        <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
          <li><strong>To Provide and Maintain Our Service:</strong> This includes managing your account, storing your notes, and enabling core functionalities like editing and organizing notes.</li>
          <li><strong>Voice-to-Text Transcription:</strong> Your voice recordings are sent to the Deepgram API to be converted into text, which then forms the basis of your notes.</li>
          <li><strong>AI Note Generation:</strong> Transcribed text is sent to the Google Gemini Pro API to generate structured and refined notes.</li>
          <li><strong>Personalization:</strong> To personalize your experience, such as displaying your profile information and preferred app settings (e.g., theme, font).</li>
          <li><strong>Collaboration:</strong> To enable sharing and collaboration features for notes, allowing you to control who can view or edit your notes.</li>
          <li><strong>Security and Fraud Prevention:</strong> To protect the integrity and security of our service and users.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground">3. Sharing Your Information</h2>
        <p className="text-muted-foreground">
          We do not sell your personal information. We may share your information with third-party service providers only to the extent necessary to provide our services, under strict data processing agreements. These include:
        </p>
        <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
          <li><strong>Supabase:</strong> For user authentication, database storage of your notes and profile data, and file storage for images.</li>
          <li><strong>Deepgram:</strong> For processing voice-to-text transcriptions. Audio data is processed in real-time and not stored by Deepgram after transcription.</li>
          <li><strong>Google Gemini:</strong> For AI-powered note refinement. Text content is sent for processing to generate structured notes.</li>
        </ul>
        <p className="text-muted-foreground mt-2">
          We may also disclose your information if required by law or in response to valid requests by public authorities (e.g., a court order or government agency).
        </p>

        <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
        <p className="text-muted-foreground">
          We implement reasonable security measures, including encryption and access controls, to protect your information from unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">5. Your Choices and Rights</h2>
        <p className="text-muted-foreground">
          You have certain rights regarding your personal data:
        </p>
        <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
          <li><strong>Access and Update:</strong> You can review and update your profile information through the settings page within the app.</li>
          <li><strong>Delete Notes:</strong> You can delete your notes at any time from the note editor.</li>
          <li><strong>Account Deletion:</strong> If you wish to delete your entire account, please contact us.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-foreground">6. Changes to This Policy</h2>
        <p className="text-muted-foreground">
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. We encourage you to review this Privacy Policy periodically for any changes.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">7. Contact Us</h2>
        <p className="text-muted-foreground">
          If you have any questions about this Privacy Policy, please contact us at [Your Contact Email Here].
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