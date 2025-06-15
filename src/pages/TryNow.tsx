import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Sparkles, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import ColorButton from '@/components/ColorButton'; // Import the new ColorButton

const TryNow = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-5xl font-extrabold mb-4 leading-tight">
          Notica: Speak. Refine. Remember.
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Transform your spoken thoughts into beautifully structured, AI-powered notes.
          Capture ideas effortlessly, organize them intelligently, and never miss a detail.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <ColorButton size="lg" onClick={() => navigate('/login')} textColorClass="text-blue-500">
            Get Started - Blue Text
          </ColorButton>
          <ColorButton size="lg" variant="outline" onClick={() => navigate('/login')} textColorClass="text-green-600">
            Get Started - Green Text
          </ColorButton>
          <ColorButton size="lg" variant="secondary" onClick={() => navigate('/login')} textColorClass="text-purple-700">
            Get Started - Purple Text
          </ColorButton>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl">
        <Card className="text-center p-6 flex flex-col items-center">
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

        <Card className="text-center p-6 flex flex-col items-center">
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

        <Card className="text-center p-6 flex flex-col items-center">
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
    </div>
  );
};

export default TryNow;