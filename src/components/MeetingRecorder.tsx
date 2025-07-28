import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2, Terminal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { v4 as uuidv4 } from 'uuid';
import { showError, showSuccess } from '@/utils/toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MeetingRecorderProps {
  title: string;
  language: string;
  onRecordingFinish: () => void;
}

const MeetingRecorder = ({ title, language, onRecordingFinish }: MeetingRecorderProps) => {
  const { user } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      streamsRef.current.forEach(stream => stream.getTracks().forEach(track => track.stop()));
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startTimer = () => {
    setTimer(0);
    timerIntervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startRecording = async () => {
    setError(null);

    if (typeof window.MediaRecorder === 'undefined') {
      setError('Recording is not supported by your browser. Please try a different browser like Chrome or Firefox.');
      return;
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      streamsRef.current = [micStream, displayStream];

      audioContextRef.current = new AudioContext();
      const destination = audioContextRef.current.createMediaStreamDestination();
      
      const micSource = audioContextRef.current.createMediaStreamSource(micStream);
      micSource.connect(destination);

      if (displayStream.getAudioTracks().length > 0) {
        const displayAudioSource = audioContextRef.current.createMediaStreamSource(displayStream);
        displayAudioSource.connect(destination);
      } else {
        showSuccess("Screen audio not shared. Recording microphone only.");
      }

      const combinedAudioStream = destination.stream;

      mediaRecorderRef.current = new MediaRecorder(combinedAudioStream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);

      mediaRecorderRef.current.onstop = async () => {
        setIsUploading(true);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const meetingId = uuidv4();
        const filePath = `${user!.id}/${meetingId}.webm`;

        const { error: uploadError } = await supabase.storage.from('meeting-recordings').upload(filePath, audioBlob);
        if (uploadError) {
          showError(`Upload failed: ${uploadError.message}`);
          setIsUploading(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage.from('meeting-recordings').getPublicUrl(filePath);

        const { error: dbError } = await supabase.from('meetings').insert({
          id: meetingId,
          user_id: user!.id,
          title: title,
          audio_url: publicUrl,
          status: 'transcribing',
        });

        if (dbError) {
          showError(`DB error: ${dbError.message}`);
          setIsUploading(false);
          await supabase.storage.from('meeting-recordings').remove([filePath]);
          return;
        }

        const { error: functionError } = await supabase.functions.invoke('transcribe-meeting', { body: { meetingId, language } });
        if (functionError) {
          showError(`Transcription failed to start: ${functionError.message}`);
          await supabase.from('meetings').update({ status: 'failed' }).eq('id', meetingId);
        } else {
          showSuccess('Meeting is processing!');
        }

        setIsUploading(false);
        onRecordingFinish();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error("Recording failed to start:", err);
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        setError('Permission to record was denied or cancelled. Please allow microphone and screen sharing permissions to record.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone or screen audio source was found. Please ensure your devices are connected.');
      } else if (err.name === 'NotSupportedError') {
        setError('Screen and audio recording is not supported by your device. Please try a different browser like Chrome or Firefox.');
      } else {
        setError(`An unexpected error occurred: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
      streamsRef.current.forEach(stream => stream.getTracks().forEach(track => track.stop()));
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    }
  };

  useEffect(() => {
    startRecording();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {error && (
        <Alert variant="destructive" className="mb-4 max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Recording Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="text-2xl font-semibold mb-2">{title}</div>
      <div className="text-6xl font-mono mb-4">{formatTime(timer)}</div>
      <Button onClick={stopRecording} size="lg" variant="destructive" disabled={isUploading}>
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Uploading...
          </>
        ) : (
          <>
            <StopCircle className="mr-2 h-6 w-6" /> Stop Recording
          </>
        )}
      </Button>
       <Button variant="link" onClick={onRecordingFinish} className="mt-4">Cancel</Button>
    </div>
  );
};

export default MeetingRecorder;