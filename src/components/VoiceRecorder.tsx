import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
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
        
        // In a real application, you would send this audioBlob to Deepgram API here.
        // For now, we'll simulate a transcription.
        console.log('Audio recorded:', audioBlob);
        showSuccess('Recording stopped. Processing transcription...');

        // Simulate API call delay
        setTimeout(() => {
          const simulatedTranscription = "This is a simulated transcription of your voice note. In a real app, Deepgram would provide this text.";
          onTranscription(simulatedTranscription);
          setIsProcessing(false);
          showSuccess('Transcription complete!');
        }, 2000);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      showSuccess('Recording started...');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      showError('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop microphone access
      setIsRecording(false);
    }
  };

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