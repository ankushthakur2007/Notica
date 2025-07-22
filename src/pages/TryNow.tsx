import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Sparkles, Users } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

const TryNow = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-black text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Notica Logo" className="h-8 w-auto" />
          <span className="font-semibold text-lg">Notica</span>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Button onClick={() => navigate('/login')} className="bg-white text-black hover:bg-gray-200">
            Get Started
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-16">
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-500/30 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/30 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16 relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight bg-gradient-to-r from-gray-200 via-white to-gray-400 bg-clip-text text-transparent">
            From Voice to Vision, Instantly.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Notica is the AI-native workspace where your spoken ideas become structured, shareable knowledge.
          </p>
        </div>

        {/* Floating Editor Mockup */}
        <div className="relative max-w-4xl mx-auto px-4 z-10">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl shadow-2xl shadow-purple-500/10 backdrop-blur-md p-4 animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            <div className="flex items-center space-x-1.5 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-6 min-h-[200px]">
              <h2 className="text-xl font-bold text-white mb-2">Meeting Recap & AI Insights</h2>
              <p className="text-gray-300">✅ Key decision: Proceed with Q3 launch.</p>
              <p className="text-gray-300">💡 Idea: Integrate new user feedback module.</p>
              <p className="text-gray-300">👤 Action Item: <span className="text-blue-400">@dave</span> to finalize the design mockups by Friday.</p>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mt-24 px-4 grid md:grid-cols-3 gap-8 relative z-10">
          <Card className="bg-gray-900/50 border border-gray-800 text-center p-6 flex flex-col items-center hover:border-purple-500/50 transition-colors duration-300">
            <Sparkles className="h-10 w-10 text-purple-400 mb-4" />
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">AI Superpowers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Go beyond transcription. Get summaries, action items, and structured notes automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border border-gray-800 text-center p-6 flex flex-col items-center hover:border-blue-500/50 transition-colors duration-300">
            <Mic className="h-10 w-10 text-blue-400 mb-4" />
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Seamless Voice Capture</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Record your thoughts, meetings, or lectures with high-accuracy transcription.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border border-gray-800 text-center p-6 flex flex-col items-center hover:border-green-500/50 transition-colors duration-300">
            <Users className="h-10 w-10 text-green-400 mb-4" />
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-white">Effortless Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Share notes, assign tasks, and work together in a single, synchronized workspace.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center text-sm text-gray-500 relative z-10">
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