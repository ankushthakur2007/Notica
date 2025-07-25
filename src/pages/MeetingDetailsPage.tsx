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
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin" /><span className="ml-2">Loading meeting...</span></div>;
  if (isError || !meeting) return <div className="flex items-center justify-center h-screen bg-background">Error loading meeting.</div>;

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="p-4 border-b flex items-center sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <Button asChild variant="ghost" size="icon">
            <Link to="/dashboard/meetings"><ChevronLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="ml-2 truncate">
            <h1 className="text-lg font-bold truncate">{meeting.title}</h1>
            <p className="text-xs text-muted-foreground truncate">{`Recorded on ${format(new Date(meeting.created_at), "M/d/yy, p")}`}</p>
          </div>
        </header>
        <Tabs defaultValue="summary" className="w-full flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-3 sticky top-[73px] bg-background/80 backdrop-blur-sm z-10">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="flex-grow overflow-y-auto p-4">
            <div className="space-y-8">
              <AISummary meeting={meeting} />
            </div>
          </TabsContent>
          <TabsContent value="transcript" className="flex-grow overflow-y-auto p-4">
            <div className="space-y-8">
              <TranscriptDisplay transcript={meeting.transcript || ''} />
            </div>
          </TabsContent>
          <TabsContent value="chat" className="flex-grow m-0 flex flex-col">
            <MeetingChat meetingId={meeting.id} initialMessages={meeting.chat_history || []} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background text-foreground">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={65}>
          <ScrollArea className="h-full">
            <div className="p-8 max-w-4xl mx-auto">
              <div className="mb-8">
                <Button asChild variant="ghost" className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
                  <Link to="/dashboard/meetings"><ChevronLeft className="h-4 w-4 mr-2" /> Back to Meetings</Link>
                </Button>
                <h1 className="text-3xl font-bold mb-2">{meeting.title}</h1>
                <p className="text-muted-foreground">{`Recorded on ${format(new Date(meeting.created_at), "MMMM d, yyyy 'at' p")}`}</p>
              </div>
              <div className="space-y-12">
                <AISummary meeting={meeting} />
                <TranscriptDisplay transcript={meeting.transcript || ''} />
              </div>
            </div>
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} minSize={25}>
          <MeetingChat meetingId={meeting.id} initialMessages={meeting.chat_history || []} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default MeetingDetailsPage;