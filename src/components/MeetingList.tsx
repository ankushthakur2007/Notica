import React, { useState } from 'react';
import { Meeting } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
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

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {meetings.map(meeting => (
        <Card 
          key={meeting.id} 
          className="flex flex-col"
        >
          <div 
            className={`flex-grow cursor-pointer hover:bg-muted/50 transition-all ${meeting.status !== 'completed' ? 'cursor-not-allowed' : ''}`}
            onClick={() => meeting.status === 'completed' && navigate(`/meetings/${meeting.id}`)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                  <CardTitle className="truncate pr-2">{meeting.title}</CardTitle>
                  {getStatusBadge(meeting.status)}
              </div>
              <CardDescription>
                {format(new Date(meeting.created_at), 'PPP p')}
              </CardDescription>
            </CardHeader>
          </div>
          <div className="p-4 pt-0 mt-auto">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  disabled={isDeleting === meeting.id}
                >
                  {isDeleting === meeting.id ? 
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                    <Trash2 className="h-4 w-4 mr-2" />
                  }
                  Delete
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
          </div>
        </Card>
      ))}
    </div>
  );
};

export default MeetingList;