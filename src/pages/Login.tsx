import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';

const Login = () => {
  const { resolvedTheme } = useTheme();
  const redirectToUrl = window.location.origin + '/dashboard/your-notes';
  console.log('Supabase Auth redirectTo URL:', redirectToUrl);

  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-200/50 dark:bg-purple-500/30 rounded-full filter blur-3xl animate-float-1 [will-change:transform]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-200/50 dark:bg-blue-500/30 rounded-full filter blur-3xl animate-float-2 [will-change:transform]"></div>
      </div>
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-md p-8 space-y-6 bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 duration-500">
        <h2 className="text-2xl font-bold text-center text-foreground">Welcome to Notica</h2>
        <p className="text-center text-muted-foreground">Speak. Refine. Remember.</p>
        <Auth
          supabaseClient={supabase}
          providers={['google']}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  brandButtonText: 'hsl(var(--primary-foreground))',
                  defaultButtonBackground: 'hsl(var(--secondary))',
                  defaultButtonBackgroundHover: 'hsl(var(--secondary-foreground))',
                  defaultButtonBorder: 'hsl(var(--border))',
                  defaultButtonText: 'hsl(var(--foreground))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputBorderHover: 'hsl(var(--ring))',
                  inputBorderFocus: 'hsl(var(--ring))',
                  inputText: 'hsl(var(--foreground))',
                  inputPlaceholder: 'hsl(var(--muted-foreground))',
                  messageText: 'hsl(var(--foreground))',
                  messageBackground: 'hsl(var(--background))',
                  messageBorder: 'hsl(var(--border))',
                  dividerBackground: 'hsl(var(--border))',
                  anchorTextColor: 'hsl(var(--primary))',
                  anchorTextHoverColor: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          redirectTo={redirectToUrl}
        />
      </div>
    </div>
  );
};

export default Login;