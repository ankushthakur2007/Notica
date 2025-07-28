import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useAppStore } from '@/stores/appStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  isIconButton?: boolean;
}

const VoiceRecorder = ({ onTranscription, isIconButton = false }: VoiceRecorderProps) => {
  const { session } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      }
      return;
    }

    // Start recording
    if (typeof window.MediaRecorder === 'undefined') {
      showError('MediaRecorder is not supported in your browser.');
      return;
    }

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
          const formData = new FormData();
          formData.append('audio', audioBlob);
          formData.append('language', selectedLanguage);

          const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/transcribe-audio', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to transcribe audio.');
          }

          const data = await response.json();
          onTranscription(data.transcription);
          setIsOpen(false); // Close dialog on success
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
  };

  const triggerButton = isIconButton ? (
    <Button variant="outline" size="icon">
      <Mic className="h-4 w-4" />
      <span className="sr-only">Start Voice Note</span>
    </Button>
  ) : (
    <Button className="w-full">
      <Mic className="mr-2 h-4 w-4" /> Start Voice Note
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Voice Note</DialogTitle>
          <DialogDescription>Select a language and start recording your thoughts.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="language-select-voice">Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage} disabled={isRecording}>
              <SelectTrigger id="language-select-voice">
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center items-center pt-4">
            <Button
              onClick={handleRecording}
              size="lg"
              variant={isRecording ? 'destructive' : 'default'}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : isRecording ? (
                <><StopCircle className="mr-2 h-4 w-4" /> Stop Recording</>
              ) : (
                <><Mic className="mr-2 h-4 w-4" /> Start Recording</>
              )}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceRecorder;