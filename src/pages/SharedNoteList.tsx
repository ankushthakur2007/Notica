import React, { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SkeletonCard from '@/components/SkeletonCard';

const SharedNoteList = () => {
  const { sharedNotes, isFetchingNotes } = useAppStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSharedNotes = sharedNotes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 w-full max-w-6xl mx-auto overflow-y-auto h-full animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.2s' }}>
      <div className="flex justify-between items-center mb-6 flex-col sm:flex-row gap-4">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground self-start sm:self-center">Shared Notes</h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shared notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full bg-card/50 dark:bg-gray-900/50 border-border/50 backdrop-blur-md"
          />
        </div>
      </div>

      {isFetchingNotes ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredSharedNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4 text-center border-2 border-dashed rounded-lg mt-8 animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards', animationDelay: '0.4s' }}>
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">{searchTerm ? 'No notes found' : 'No shared notes yet!'}</h2>
          <p className="text-muted-foreground">{searchTerm ? 'Try a different search term.' : 'Notes shared with you will appear here.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSharedNotes.map((note, index) => (
            <Card 
              key={note.id} 
              className="bg-card border rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer flex flex-col"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => navigate(`/dashboard/edit-note/${note.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
                <Badge variant={note.permission_level === 'write' ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
                  {note.permission_level === 'write' ? 'Editable' : 'Read-Only'}
                </Badge>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
                  {note.content && note.content !== '<p></p>' ? 'Content available' : 'No content preview available.'}
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-3 border-t mt-auto">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarImage src={note.profiles?.avatar_url || undefined} alt={note.profiles?.first_name || 'Owner'} />
                    <AvatarFallback>
                      {note.profiles?.first_name?.[0] || 'O'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate">
                    Shared by {note.profiles?.first_name || 'the owner'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex-shrink-0">
                  {format(new Date(note.updated_at), 'MMM d')}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedNoteList;