import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  language: string;
  isIconButton?: boolean;
}

const VoiceRecorder = ({ onTranscription, language, isIconButton = false }: VoiceRecorderProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening even after a pause
    recognition.interimResults = false; // We only want the final transcript for each utterance
    recognition.lang = language;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      // Concatenate all final results since the last start
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        // Add a space at the end for continuous typing feel
        onTranscription(finalTranscript.trim() + ' ');
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        showError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // Only set to false if it wasn't manually stopped
      if (recognitionRef.current) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on component unmount or language change
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, onTranscription]);

  const handleToggleListening = () => {
    if (!isSupported) {
      showError('Voice recognition is not supported by your browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        // This can happen if it's already started
        console.error("Could not start recognition", e);
      }
    }
  };

  const buttonContent = isIconButton ? (
    isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />
  ) : (
    <>
      {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
      {isListening ? 'Stop Listening' : 'Start Listening'}
    </>
  );

  return (
    <Button
      variant="outline"
      size={isIconButton ? 'icon' : 'sm'}
      onClick={handleToggleListening}
      disabled={!isSupported}
      className={cn(isListening && 'text-destructive border-destructive hover:text-destructive')}
      title={isSupported ? 'Start/Stop voice transcription' : 'Voice transcription not supported'}
    >
      {buttonContent}
      <span className="sr-only">Toggle voice transcription</span>
    </Button>
  );
};

export default VoiceRecorder;