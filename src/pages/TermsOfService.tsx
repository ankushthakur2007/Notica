import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-8">
      <div className="w-full max-w-3xl bg-card rounded-lg shadow-lg p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center text-primary">Terms of Service</h1>
        <p className="text-muted-foreground">
          Welcome to Notica! These Terms of Service govern your use of our application.
          By accessing or using Notica, you agree to be bound by these Terms.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">
          By creating an account and using Notica, you agree to comply with and be bound by these Terms.
          If you do not agree to these Terms, you may not use our services.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
        <p className="text-muted-foreground">
          You must be at least 13 years old to use Notica. You are responsible for maintaining the confidentiality of your account information.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">3. User Content</h2>
        <p className="text-muted-foreground">
          You retain all rights to the content you create and submit through Notica (your "Notes").
          By using our service, you grant Notica a license to use, reproduce, and display your Notes solely for the purpose of providing and improving the service.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">4. Prohibited Conduct</h2>
        <p className="text-muted-foreground">
          You agree not to use Notica for any unlawful or prohibited activities, including but not limited to:
          uploading malicious content, infringing on intellectual property rights, or harassing other users.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">5. Disclaimers</h2>
        <p className="text-muted-foreground">
          Notica is provided "as is" without any warranties, express or implied. We do not guarantee that the service will be uninterrupted or error-free.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">6. Limitation of Liability</h2>
        <p className="text-muted-foreground">
          In no event shall Notica be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">7. Changes to Terms</h2>
        <p className="text-muted-foreground">
          We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the updated Terms on this page.
        </p>

        <h2 className="text-2xl font-semibold text-foreground">8. Governing Law</h2>
        <p className="text-muted-foreground">
          These Terms shall be governed by the laws of [Your Jurisdiction], without regard to its conflict of law principles.
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

export default TermsOfService;