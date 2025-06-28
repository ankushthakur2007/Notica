import React, { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Share2, Copy, Loader2, UserPlus, XCircle } from 'lucide-react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Note, Collaborator } from '@/types';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSessionContext } from '@/contexts/SessionContext';

interface ShareNoteDialogProps {
  noteId: string;
  isNoteOwner: boolean; // Prop to indicate if the current user is the note owner
}

const NoteCollaborationDialog = ({ noteId, isNoteOwner }: ShareNoteDialogProps) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useSessionContext(); // Current logged-in user
  const [isOpen, setIsOpen] = useState(false);
  const [isSharableLinkEnabled, setIsSharableLinkEnabled] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isUpdatingShareLink, setIsUpdatingShareLink] = useState(false);

  // Collaborator management states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; first_name: string | null; last_name: string | null; avatar_url: string | null }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isManagingCollaborators, setIsManagingCollaborators] = useState(false);

  // Fetch the current note's sharable link status and existing collaborators
  const { data: note, isLoading: isLoadingNote } = useQuery<Note, Error>({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, is_sharable_link_enabled')
        .eq('id', noteId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isOpen && !!noteId,
  });

  const { data: currentCollaborators, isLoading: isLoadingCollaborators, refetch: refetchCollaborators } = useQuery<Collaborator[], Error>({
    queryKey: ['collaborators', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          *,
          profiles(first_name, last_name, avatar_url)
        `)
        .eq('note_id', noteId);

      if (error) throw error;

      // Map the data to include profile details directly
      return data.map(collab => ({
        ...collab,
        first_name: collab.profiles?.first_name || null,
        last_name: collab.profiles?.last_name || null,
        avatar_url: collab.profiles?.avatar_url || null,
        // Note: email is not directly available from profiles, would need a join with auth.users in a function
      })) as Collaborator[];
    },
    enabled: isOpen && !!noteId && isNoteOwner, // Only fetch collaborators if owner
  });

  useEffect(() => {
    if (note) {
      setIsSharableLinkEnabled(note.is_sharable_link_enabled);
      if (note.is_sharable_link_enabled) {
        setShareLink(`${window.location.origin}/dashboard/edit-note/${noteId}`);
      } else {
        setShareLink('');
      }
    }
  }, [note, noteId]);

  const handleToggleShareableLink = async (checked: boolean) => {
    setIsUpdatingShareLink(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({ is_sharable_link_enabled: checked })
        .eq('id', noteId);

      if (error) {
        throw error;
      }
      setIsSharableLinkEnabled(checked);
      if (checked) {
        setShareLink(`${window.location.origin}/dashboard/edit-note/${noteId}`);
        showSuccess('Shareable link enabled!');
      } else {
        setShareLink('');
        showSuccess('Shareable link disabled!');
      }
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (error: any) {
      console.error('Error updating shareable link status:', error.message);
      showError('Failed to update shareable link status: ' + error.message);
    } finally {
      setIsUpdatingShareLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) {
      showError('No link to copy.');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareLink);
      showSuccess('Share link copied to clipboard!');
    } catch (err: any) {
      console.warn('Failed to copy using Clipboard API, falling back to execCommand:', err);
      const textarea = document.createElement('textarea');
      textarea.value = shareLink;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        showSuccess('Share link copied to clipboard (fallback)!');
      } catch (execErr) {
        console.error('Fallback copy failed:', execErr);
        showError('Failed to copy link to clipboard. Please copy it manually.');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/search-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.id}`, // Auth header is not strictly needed for this public function, but good practice
        },
        body: JSON.stringify({ searchTerm: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search users.');
      }

      const data = await response.json();
      // Filter out the current user and already existing collaborators
      const filteredResults = data.profiles.filter((profile: any) => 
        profile.id !== currentUser?.id && 
        !currentCollaborators?.some(collab => collab.user_id === profile.id)
      );
      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error searching users:', error.message);
      showError('Failed to search users: ' + error.message);
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ userId, permissionLevel }: { userId: string; permissionLevel: 'read' | 'write' }) => {
      setIsManagingCollaborators(true);
      const { data, error } = await supabase
        .from('collaborators')
        .insert({ note_id: noteId, user_id: userId, permission_level: permissionLevel })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Collaborator added!');
      setSearchQuery('');
      setSearchResults([]);
      refetchCollaborators(); // Re-fetch collaborators to update the list
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes list to update shared status
    },
    onError: (error: any) => {
      console.error('Error adding collaborator:', error.message);
      showError('Failed to add collaborator: ' + error.message);
    },
    onSettled: () => {
      setIsManagingCollaborators(false);
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ collaboratorId, permissionLevel }: { collaboratorId: string; permissionLevel: 'read' | 'write' }) => {
      setIsManagingCollaborators(true);
      const { data, error } = await supabase
        .from('collaborators')
        .update({ permission_level: permissionLevel })
        .eq('id', collaboratorId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Permission updated!');
      refetchCollaborators();
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error: any) => {
      console.error('Error updating permission:', error.message);
      showError('Failed to update permission: ' + error.message);
    },
    onSettled: () => {
      setIsManagingCollaborators(false);
    }
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      setIsManagingCollaborators(true);
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Collaborator removed!');
      refetchCollaborators();
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error: any) => {
      console.error('Error removing collaborator:', error.message);
      showError('Failed to remove collaborator: ' + error.message);
    },
    onSettled: () => {
      setIsManagingCollaborators(false);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share Note</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[475px]"> {/* Increased max-width slightly */}
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            Manage sharing and collaboration for this note.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Public Shareable Link Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-link-toggle">Enable Shareable Link</Label>
              <Switch
                id="share-link-toggle"
                checked={isSharableLinkEnabled}
                onCheckedChange={handleToggleShareableLink}
                disabled={isUpdatingShareLink || isLoadingNote || !isNoteOwner}
              />
            </div>

            {isSharableLinkEnabled && (
              <div className="space-y-2">
                <Label htmlFor="share-link">Share Link</Label>
                <div className="flex space-x-2">
                  <Input
                    id="share-link"
                    value={shareLink}
                    readOnly
                    className="flex-grow"
                  />
                  <Button onClick={handleCopyLink} disabled={!shareLink}>
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy Link</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This link provides read-only access to anyone.
                </p>
              </div>
            )}
          </div>

          {/* Collaborator Management Section (Owner Only) */}
          {isNoteOwner && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Collaborators</h3>
              
              {/* Search for users */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Search user by email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchUsers();
                    }
                  }}
                  disabled={isSearchingUsers || isManagingCollaborators}
                />
                <Button onClick={handleSearchUsers} disabled={isSearchingUsers || isManagingCollaborators}>
                  {isSearchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span className="sr-only">Search</span>
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <Command className="rounded-lg border shadow-md">
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    {searchResults.map((user) => (
                      <CommandItem key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.first_name || user.email || 'User'} />
                            <AvatarFallback>{(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user.first_name || user.email}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => addCollaboratorMutation.mutate({ userId: user.id, permissionLevel: 'read' })}
                          disabled={addCollaboratorMutation.isPending || isManagingCollaborators}
                        >
                          {addCollaboratorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                        </Button>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              )}

              {/* Current Collaborators List */}
              <div className="space-y-3">
                <h4 className="text-md font-medium">Current Collaborators</h4>
                {isLoadingCollaborators ? (
                  <p className="text-muted-foreground">Loading collaborators...</p>
                ) : currentCollaborators && currentCollaborators.length > 0 ? (
                  <div className="space-y-2">
                    {currentCollaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={collab.avatar_url || undefined} alt={collab.first_name || collab.user_id} />
                            <AvatarFallback>{(collab.first_name?.[0] || 'C').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{collab.first_name || `User (${collab.user_id.substring(0, 4)}...)`}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={collab.permission_level}
                            onValueChange={(value: 'read' | 'write') => updatePermissionMutation.mutate({ collaboratorId: collab.id, permissionLevel: value })}
                            disabled={isManagingCollaborators}
                          >
                            <SelectTrigger className="w-[120px] h-9">
                              <SelectValue placeholder="Permission" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read">Read</SelectItem>
                              <SelectItem value="write">Write</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeCollaboratorMutation.mutate(collab.id)}
                            disabled={isManagingCollaborators}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Remove collaborator</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No collaborators added yet.</p>
                )}
              </div>
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

export default NoteCollaborationDialog;