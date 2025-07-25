import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { Meeting } from '@/types';
import MeetingList from '@/components/MeetingList';
import MeetingRecorder from '@/components/MeetingRecorder';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';

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

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading meetings...</p>
        </div>
    );
  }

  if (isRecording) {
    return <MeetingRecorder onRecordingFinish={() => {
      setIsRecording(false);
      refetch();
    }} />;
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-6xl mx-auto overflow-y-auto h-full animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 flex-col sm:flex-row gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground self-start sm:self-center">Meeting Intelligence</h2>
        <Button onClick={() => setIsRecording(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record New Meeting
        </Button>
      </div>
      {meetings && meetings.length > 0 ? (
        <MeetingList meetings={meetings} />
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