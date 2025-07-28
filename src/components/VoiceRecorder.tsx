import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  isIconButton?: boolean;
}

const VoiceRecorder = ({ onTranscription, isIconButton = false }: VoiceRecorderProps) => {
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
    recognition.continuous = true;
    recognition.interimResults = false;
    // The 'lang' property is no longer set, allowing the browser to auto-detect.

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
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
      if (recognitionRef.current) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [onTranscription]);

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