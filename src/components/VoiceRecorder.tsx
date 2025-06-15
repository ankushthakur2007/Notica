import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2, Download } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useSessionContext } from '@/contexts/SessionContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

// Define SpeechRecognition for broader browser compatibility
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const { session } = useSessionContext();
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
            console.error('Error during transcription:', error);
            showError('Failed to transcribe audio: ' + error.message);
          } finally {
            setIsProcessing(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        showSuccess('Recording started (Deepgram)...');
      } catch (err) {
        console.error('Error accessing microphone for MediaRecorder:', err);
        showError('Failed to start recording. Please check microphone permissions.');
      }
    } else if (SpeechRecognition) {
      // Fallback to Web Speech API
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

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
    } else {
      showError('Neither MediaRecorder nor Web Speech API is supported in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <>
      {!isRecording && !isProcessing && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={startRecording} variant="ghost" size="icon" disabled={isProcessing}>
              <Mic className="h-4 w-4" />
              <span className="sr-only">Start Voice Note</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Start Voice Note</p>
          </TooltipContent>
        </Tooltip>
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
    </>
  );
};

export default VoiceRecorder;