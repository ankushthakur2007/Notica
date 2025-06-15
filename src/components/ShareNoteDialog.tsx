import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { User, XCircle, Share2, Loader2 } from 'lucide-react';
import { useSessionContext } from '@/contexts/SessionContext';
import { useQueryClient } from '@tanstack/react-query';

interface ShareNoteDialogProps {
  noteId: string;
}

const ShareNoteDialog = ({ noteId }: ShareNoteDialogProps) => {
  const { user: currentUser, session } = useSessionContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'write'>('read');
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  const handleSearchUsers = async () => {
    if (!searchEmail) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      if (!session?.access_token) {
        showError('You must be logged in to search users.');
        setIsSearching(false);
        return;
      }

      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/search-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ searchTerm: searchEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search users.');
      }

      const data = await response.json();
      
      // Filter out current user from search results
      const filteredResults = data.profiles.filter(
        (profile: any) => profile.id !== currentUser?.id
      );
      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error searching users:', error.message);
      showError('Failed to search users: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!selectedUser || !noteId) return;

    setIsAddingCollaborator(true);
    try {
      const { error } = await supabase.from('collaborators').insert({
        note_id: noteId,
        user_id: selectedUser.id,
        permission_level: permissionLevel,
      });

      if (error) {
        throw error;
      }
      showSuccess(`${selectedUser.first_name || 'User'} added as collaborator!`);
      setSearchEmail('');
      setSearchResults([]);
      setSelectedUser(null);
      setPermissionLevel('read');
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes list to reflect changes
    } catch (error: any) {
      console.error('Error adding collaborator:', error.message);
      showError('Failed to add collaborator: ' + error.message);
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share Note</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            Add new collaborators for this note.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="search-email" className="text-right">
              Search
            </Label>
            <Input
              id="search-email"
              placeholder="Search by email..."
              className="col-span-3"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
          </div>
          <Button onClick={handleSearchUsers} disabled={isSearching || !searchEmail}>
            {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Search Users
          </Button>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
              {searchResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{result.first_name} {result.last_name}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedUser(result)}>
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="space-y-2 p-2 border rounded-md bg-muted">
              <Label>Add Collaborator</Label>
              <div className="flex items-center justify-between">
                <span>{selectedUser.first_name} {selectedUser.last_name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <Select value={permissionLevel} onValueChange={(value: 'read' | 'write') => setPermissionLevel(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Permission Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Write</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddCollaborator} className="w-full" disabled={isAddingCollaborator}>
                {isAddingCollaborator ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Collaborator
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareNoteDialog;