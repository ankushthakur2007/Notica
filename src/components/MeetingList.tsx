import React from 'react';
import { Meeting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface MeetingListProps {
  meetings: Meeting[];
}

const MeetingList = ({ meetings }: MeetingListProps) => {
  const navigate = useNavigate();

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
          className={`cursor-pointer hover:border-primary transition-all ${meeting.status !== 'completed' ? 'cursor-not-allowed opacity-70' : ''}`}
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
        </Card>
      ))}
    </div>
  );
};

export default MeetingList;