import React, { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const SharedNoteList = () => {
  const { sharedNotes, isFetchingNotes } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSharedNotes = sharedNotes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isFetchingNotes) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading shared notes...</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-6xl mx-auto overflow-y-auto h-full animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Shared Notes</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shared notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full sm:w-64 bg-card/50 dark:bg-gray-900/50 border-border/50 backdrop-blur-md"
          />
        </div>
      </div>

      {filteredSharedNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4 text-center animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.4s' }}>
          <h2 className="text-2xl font-bold mb-2">{searchTerm ? 'No notes found' : 'No shared notes yet!'}</h2>
          <p className="text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'Notes shared with you will appear here.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSharedNotes.map((note, index) => (
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
      )}
    </div>
  );
};

export default SharedNoteList;