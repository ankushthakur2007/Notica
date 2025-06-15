import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Sparkles, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

const TryNow = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center bg-background text-foreground p-4 sm:p-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
          Notica: <span className="text-primary">Speak. Refine. Remember.</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Transform your spoken thoughts into beautifully structured, AI-powered notes.
          Capture ideas effortlessly, organize them intelligently, and never miss a detail.
        </p>
        <Button size="lg" className="px-8 py-3 text-lg" onClick={() => navigate('/login')}>
          Get Started - It's Free!
        </Button>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-6xl pb-16">
        <Card className="text-center p-6 flex flex-col items-center shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
          <Mic className="h-14 w-14 text-primary mb-5" />
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-2xl font-semibold">Voice to Text</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-base">
              Record your thoughts, meetings, or lectures. Our advanced speech-to-text
              transcribes every word with high accuracy.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center p-6 flex flex-col items-center shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
          <Sparkles className="h-14 w-14 text-primary mb-5" />
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-2xl font-semibold">AI-Generated Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-base">
              Let AI transform raw transcripts into organized, readable notes with
              headings, bullet points, and emojis.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center p-6 flex flex-col items-center shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
          <PencilLine className="h-14 w-14 text-primary mb-5" />
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-2xl font-semibold">Rich Text Editor</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-muted-foreground text-base">
              Refine your notes further with a powerful rich text editor. Add images,
              links, and format your content perfectly.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default TryNow;