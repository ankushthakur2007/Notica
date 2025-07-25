import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useAppStore } from '@/stores/appStore';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  isIconButton?: boolean;
}

// This is a browser API, so we need to declare it for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceRecorder = ({ onTranscription, isIconButton = false }: VoiceRecorderProps) => {
  const { session } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
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
          } catch (error: any) {
            showError('Failed to transcribe audio: ' + error.message);
          } finally {
            setIsProcessing(false);
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        showSuccess('Recording started...');
      } catch (err: any) {
        console.error("Voice recording failed to start:", err);
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          showError('Microphone permission denied. Please allow access to your microphone.');
        } else {
          showError('Failed to start recording. Please check microphone permissions.');
        }
      }
    } else {
      showError('MediaRecorder is not supported in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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