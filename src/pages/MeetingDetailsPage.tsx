import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Meeting } from '@/types';
import AISummary from '@/components/AISummary';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import MeetingChat from '@/components/MeetingChat';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';

const fetchMeetingDetails = async (meetingId: string): Promise<Meeting> => {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();
  if (error) throw new Error(error.message);
  return data as Meeting;
};

const MeetingDetailsPage = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const isMobile = useIsMobile();

  const { data: meeting, isLoading, isError } = useQuery<Meeting, Error>({
    queryKey: ['meetingDetails', meetingId],
    queryFn: () => fetchMeetingDetails(meetingId!),
    enabled: !!meetingId,
  });

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Loading meeting...</span></div>;
  if (isError || !meeting) return <div className="flex items-center justify-center h-screen">Error loading meeting.</div>;

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen">
        <header className="p-4 border-b flex items-center">
          <Button asChild variant="ghost" size="icon">
            <Link to="/meetings"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-lg font-bold truncate ml-2">{meeting.title}</h1>
        </header>
        <Tabs defaultValue="summary" className="w-full flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="flex-grow overflow-y-auto p-4"><AISummary meeting={meeting} /></TabsContent>
          <TabsContent value="transcript" className="flex-grow overflow-y-auto p-4"><TranscriptDisplay transcript={meeting.transcript || ''} /></TabsContent>
          <TabsContent value="chat" className="flex-grow m-0"><MeetingChat meetingId={meeting.id} /></TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={65}>
        <div className="flex flex-col h-full p-6 overflow-y-auto">
          <h1 className="text-2xl font-bold mb-4">{meeting.title}</h1>
          <AISummary meeting={meeting} />
          <TranscriptDisplay transcript={meeting.transcript || ''} />
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={35} minSize={25}>
        <MeetingChat meetingId={meeting.id} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default MeetingDetailsPage;