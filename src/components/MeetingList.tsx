import React, { useState } from 'react';
import { Meeting } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import MeetingStatusIndicator from './MeetingStatusIndicator';

interface MeetingListProps {
  meetings: Meeting[];
  onDeleteMeeting: (meeting: Meeting) => Promise<void>;
}

const MeetingList = ({ meetings, onDeleteMeeting }: MeetingListProps) => {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (meeting: Meeting) => {
    setIsDeleting(meeting.id);
    await onDeleteMeeting(meeting);
    setIsDeleting(null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {meetings.map(meeting => (
        <Card 
          key={meeting.id} 
          className="flex flex-col justify-between bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md transition-all duration-300"
        >
          <div 
            className={meeting.status === 'completed' ? 'cursor-pointer hover:bg-muted/50 rounded-t-lg' : ''}
            onClick={() => meeting.status === 'completed' && navigate(`/meetings/${meeting.id}`)}
          >
            <CardHeader>
              <CardTitle className="truncate">{meeting.title}</CardTitle>
              <CardDescription>
                {format(new Date(meeting.created_at), 'PPP p')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center min-h-[100px]">
              {meeting.status === 'completed' ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <p className="font-semibold text-foreground">Insights Ready</p>
                  <p className="text-sm text-muted-foreground">Click to view details</p>
                </div>
              ) : (
                <MeetingStatusIndicator status={meeting.status} />
              )}
            </CardContent>
          </div>
          <CardFooter className="bg-muted/30 dark:bg-black/20 p-3 flex justify-end border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={isDeleting === meeting.id}
                >
                  {isDeleting === meeting.id ? 
                    <Loader2 className="h-4 w-4 animate-spin" /> : 
                    <Trash2 className="h-4 w-4" />
                  }
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the meeting "{meeting.title}" and its recording. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(meeting)} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default MeetingList;