import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Sparkles, PencilLine } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import AbstractGraphic from '@/components/AbstractGraphic'; // Import the new graphic component

const TryNow = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4 
                    animate-in fade-in-0 duration-500 
                    relative overflow-hidden">
      {/* Subtle radial gradient background */}
      <div className="absolute inset-0 z-0 opacity-20 dark:opacity-10" 
           style={{ 
             background: 'radial-gradient(circle at top left, var(--primary) 0%, transparent 30%), radial-gradient(circle at bottom right, var(--secondary) 0%, transparent 30%)' 
           }}></div>

      {/* Abstract Graphic */}
      <AbstractGraphic className="top-1/4 left-1/4 w-1/2 h-1/2 animate-in fade-in-0 zoom-in-95 duration-1000 delay-500" />
      <AbstractGraphic className="bottom-1/4 right-1/4 w-1/2 h-1/2 animate-in fade-in-0 zoom-in-95 duration-1000 delay-700 rotate-180" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="text-center max-w-3xl mx-auto mb-12 animate-in fade-in-0 slide-in-from-top-4 duration-700 z-10">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
          Notica: <span className="text-primary">Speak.</span> <span className="text-accent-foreground">Refine.</span> <span className="text-primary">Remember.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Transform your spoken thoughts into beautifully structured, AI-powered notes.
          Capture ideas effortlessly, organize them intelligently, and never miss a detail.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/login')} className="shadow-lg hover:shadow-xl transition-all duration-300">
            Get Started
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl z-10">
        <Card className="text-center p-6 flex flex-col items-center 
                        animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-100 
                        hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer">
          <Mic className="h-12 w-12 text-primary mb-4" />
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Voice to Text</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Record your thoughts, meetings, or lectures. Our advanced speech-to-text
              transcribes every word with high accuracy.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center p-6 flex flex-col items-center 
                        animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-200 
                        hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer">
          <Sparkles className="h-12 w-12 text-primary mb-4" />
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">AI-Generated Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Let AI transform raw transcripts into organized, readable notes with
              headings, bullet points, and emojis.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center p-6 flex flex-col items-center 
                        animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-300 
                        hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer">
          <PencilLine className="h-12 w-12 text-primary mb-4" />
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Rich Text Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Refine your notes further with a powerful rich text editor. Add images,
              links, and format your content perfectly.
            </p>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-auto pt-6 text-center text-sm text-muted-foreground animate-in fade-in-0 duration-700 delay-400 z-10">
        <p>
          &copy; {new Date().getFullYear()} Notica. All rights reserved.
        </p>
        <div className="flex justify-center space-x-4 mt-2">
          <Link to="/privacy-policy" className="hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms-of-service" className="hover:underline">
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default TryNow;