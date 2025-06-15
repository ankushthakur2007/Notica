import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useSessionContext } from '@/contexts/SessionContext';
import { cn } from '@/lib/utils'; // Import cn for conditional class names

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  className?: string; // Allow parent to pass additional class names
}

// Define SpeechRecognition for broader browser compatibility
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceRecorder = ({ onTranscription, className }: VoiceRecorderProps) => {
  const { session } = useSessionContext();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startWebSpeechApi = () => {
    if (!SpeechRecognition) {
      showError('Web Speech API is not supported in your browser.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false; // Get a single, final result
    recognitionRef.current.interimResults = false; // Only final results

    recognitionRef.current.onstart = () => {
      setIsRecording(true);
      showSuccess('Recording started (Web Speech API)...');
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(alternative => alternative.transcript)
        .join('');
      onTranscription(transcript);
      showSuccess('Web Speech API transcription complete!');
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Web Speech API error:', event.error);
      showError('Web Speech API error: ' + event.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
  };

  const startRecording = async () => {
    // Prioritize MediaRecorder with Deepgram for better control and quality
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          setIsProcessing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          if (!session?.access_token) {
            showError('You must be logged in to record voice notes.');
            setIsProcessing(false);
            return;
          }

          try {
            const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/transcribe-audio', {
              method: 'POST',
              headers: {
                'Content-Type': audioBlob.type,
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: audioBlob,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to transcribe audio.');
            }

            const data = await response.json();
            onTranscription(data.transcription);
            showSuccess('Transcription complete!');
          } catch (error: any) {
            console.error('Error during Deepgram transcription:', error);
            showError('Failed to transcribe audio with Deepgram: ' + error.message);
          } finally {
            setIsProcessing(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        showSuccess('Recording started (Deepgram)...');
      } catch (err: any) {
        console.error('Error accessing microphone for MediaRecorder:', err);
        showError('Failed to start recording with Deepgram. Attempting Web Speech API fallback...');
        // Fallback to Web Speech API if MediaRecorder fails
        startWebSpeechApi();
      }
    } else {
      // Directly use Web Speech API if MediaRecorder is not available at all
      showError('MediaRecorder not supported. Attempting Web Speech API...');
      startWebSpeechApi();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop microphone access
      setIsRecording(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      disabled={isProcessing} 
      className={cn(className)} // Apply passed className
      variant={isRecording ? "destructive" : "outline"} // Change variant when recording
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <StopCircle className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
      <span className="sr-only">{isRecording ? 'Stop Recording' : 'Start Voice Note'}</span>
    </Button>
  );
};

export default VoiceRecorder;