import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { Meeting } from '@/types';
import MeetingList from '@/components/MeetingList';
import MeetingRecorder from '@/components/MeetingRecorder';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

const fetchMeetings = async (userId: string): Promise<Meeting[]> => {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Meeting[];
};

const MeetingIntelligencePage = () => {
  const { user } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isNameMeetingDialogOpen, setIsNameMeetingDialogOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [selectedMeetingTitle, setSelectedMeetingTitle] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const { data: meetings, isLoading, refetch } = useQuery<Meeting[], Error>({
    queryKey: ['meetings', user?.id],
    queryFn: () => fetchMeetings(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`meetings-channel-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Meeting updated, refetching!', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const handleStartRecording = () => {
    if (newMeetingTitle.trim() === '') {
      showError('Please enter a title for the meeting.');
      return;
    }
    setSelectedMeetingTitle(newMeetingTitle);
    setIsRecording(true);
    setIsNameMeetingDialogOpen(false);
    setNewMeetingTitle('');
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    if (!user) return;

    const filePath = `${user.id}/${meeting.id}.webm`;
    const { error: storageError } = await supabase.storage
      .from('meeting-recordings')
      .remove([filePath]);

    if (storageError && storageError.message !== 'The resource was not found') {
      showError(`Failed to delete recording file: ${storageError.message}`);
      return;
    }

    const { error: dbError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meeting.id);

    if (dbError) {
      showError(`Failed to delete meeting record: ${dbError.message}`);
      return;
    }

    showSuccess('Meeting deleted successfully.');
    refetch();
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading meetings...</p>
        </div>
    );
  }

  if (isRecording) {
    return <MeetingRecorder title={selectedMeetingTitle} language={selectedLanguage} onRecordingFinish={() => {
      setIsRecording(false);
      refetch();
    }} />;
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-6xl mx-auto overflow-y-auto h-full animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 flex-col sm:flex-row gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground self-start sm:self-center">Meeting Intelligence</h2>
        <Dialog open={isNameMeetingDialogOpen} onOpenChange={setIsNameMeetingDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Record New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Meeting</DialogTitle>
              <DialogDescription>
                Give your meeting a title and select the primary language that will be spoken.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="meeting-title">Meeting Title</Label>
                <Input
                  id="meeting-title"
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  placeholder="e.g., Q3 Project Kickoff"
                />
              </div>
              <div>
                <Label htmlFor="language-select">Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger id="language-select">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNameMeetingDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleStartRecording}>Start Recording</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {meetings && meetings.length > 0 ? (
        <MeetingList meetings={meetings} onDeleteMeeting={handleDeleteMeeting} />
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg mt-8">
          <h3 className="text-xl font-semibold">No meetings recorded yet</h3>
          <p className="text-muted-foreground mt-2">Click "Record New Meeting" to get started.</p>
        </div>
      )}
    </div>
  );
};

export default MeetingIntelligencePage;