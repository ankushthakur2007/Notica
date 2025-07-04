import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useSessionContext } from '@/contexts/SessionContext'; // Import useSessionContext

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  isIconButton?: boolean; // New prop to control button style
}

// Define SpeechRecognition for broader browser compatibility
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceRecorder = ({ onTranscription, isIconButton = false }: VoiceRecorderProps) => {
  const { session } = useSessionContext(); // Get session here
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
          
          if (!session?.access_token) { // Check for session token
            showError('You must be logged in to record voice notes.');
            setIsProcessing(false);
            return;
          }

          try {
            // Invoke the Supabase Edge Function for transcription
            const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/transcribe-audio', {
              method: 'POST',
              headers: {
                'Content-Type': audioBlob.type,
                'Authorization': `Bearer ${session.access_token}`, // Add Authorization header
              },
              body: audioBlob,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to transcribe audio.');
            }

            const data = await response.json();
            onTranscription(data.transcription);
            // Removed: showSuccess('Transcription complete!');
          } catch (error: any) {
            console.error('Error during transcription:', error);
            showError('Failed to transcribe audio: ' + error.message);
          } finally {
            setIsProcessing(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        showSuccess('Recording started (Deepgram)...'); // Keep this one as it's an action confirmation
      } catch (err) {
        console.error('Error accessing microphone for MediaRecorder:', err);
        showError('Failed to start recording. Please check microphone permissions.');
      }
    } else if (SpeechRecognition) {
      // Fallback to Web Speech API
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Get a single, final result
      recognitionRef.current.interimResults = false; // Only final results

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        showSuccess('Recording started (Web Speech API)...'); // Keep this one as it's an action confirmation
      };

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(alternative => alternative.transcript)
          .join('');
        onTranscription(transcript);
        // Removed: showSuccess('Web Speech API transcription complete!');
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
    } else {
      showError('Neither MediaRecorder nor Web Speech API is supported in your browser.');
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

  if (isIconButton) {
    return (
      <Button 
        onClick={isRecording ? stopRecording : startRecording} 
        variant="outline" 
        size="icon" 
        disabled={isProcessing}
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
  }

  return (
    <div className="flex items-center space-x-2">
      {!isRecording && !isProcessing && (
        <Button onClick={startRecording} className="w-full" disabled={isProcessing}>
          <Mic className="mr-2 h-4 w-4" /> Start Voice Note
        </Button>
      )}
      {isRecording && (
        <Button onClick={stopRecording} variant="destructive" className="w-full">
          <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
        </Button>
      )}
      {isProcessing && (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
        </Button>
      )}
    </div>
  );
};

export default VoiceRecorder;