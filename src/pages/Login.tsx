import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';

const Login = () => {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
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
                  anchorText: 'hsl(var(--primary))',
                  anchorTextHover: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme={theme === 'dark' ? ThemeSupa : ThemeSupa} // Use ThemeSupa for both, but ensure the theme prop is dynamic
          redirectTo={window.location.origin + '/dashboard'}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;