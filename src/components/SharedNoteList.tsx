import React from 'react';
import { useAppStore } from '@/stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const SharedNoteList = () => {
  const { sharedNotes, isFetchingNotes } = useAppStore();
  const navigate = useNavigate();

  if (isFetchingNotes) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading shared notes...</p>
      </div>
    );
  }

  if (!sharedNotes || sharedNotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center animate-in fade-in-0 duration-700 delay-100">
        <h2 className="text-2xl font-bold mb-2">No shared notes yet!</h2>
        <p className="text-muted-foreground">Notes shared with you will appear here.</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-6xl mx-auto overflow-y-auto h-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <h2 className="text-4xl font-extrabold tracking-tight mb-6 text-foreground">Shared Notes</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sharedNotes.map((note, index) => (
          <Card 
            key={note.id} 
            className="bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md hover:border-primary/50 transition-all duration-300 cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => navigate(`/dashboard/edit-note/${note.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
              <Badge variant={note.permission_level === 'write' ? 'default' : 'secondary'} className="ml-2">
                {note.permission_level === 'write' ? 'Editable' : 'Read-Only'}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{note.content ? 'Content available' : 'No content preview available.'}</p>
              <p className="text-xs text-gray-500">Created: {format(new Date(note.created_at), 'PPP')}</p>
              <p className="text-xs text-gray-500">Updated: {format(new Date(note.updated_at), 'PPP')}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SharedNoteList;