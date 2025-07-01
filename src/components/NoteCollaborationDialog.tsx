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
import { Collaborator } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';

interface ShareNoteDialogProps {
  noteId: string;
  isNoteOwner: boolean;
  isSharableLinkEnabled: boolean; // New prop for current status
  onToggleShareableLink: (checked: boolean) => Promise<void>; // New prop for update function
}

const NoteCollaborationDialog = ({ noteId, isNoteOwner, isSharableLinkEnabled, onToggleShareableLink }: ShareNoteDialogProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isUpdatingShareLink, setIsUpdatingShareLink] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedUser, setSelectedUser] = useState<Collaborator | null>(null);
  const [newPermissionLevel, setNewPermissionLevel] = useState<'read' | 'write'>('read');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  // Debugging: Log the props received when the dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('NoteCollaborationDialog opened. Props:');
      console.log('  noteId:', noteId);
      console.log('  isNoteOwner:', isNoteOwner);
      console.log('  isSharableLinkEnabled:', isSharableLinkEnabled);
    }
  }, [isOpen, noteId, isNoteOwner, isSharableLinkEnabled]);

  // Query to search users by email using the Edge Function
  const { data: searchResults, isLoading: isLoadingSearchResults } = useQuery<Collaborator[], Error>({
    queryKey: ['searchUsers', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      try {
        const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/search-users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ searchTerm: debouncedSearchTerm }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to search users.');
        }
        const data = await response.json();
        return data.profiles.map((profile: any) => ({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          email: profile.email, // Email is now included from the edge function
        })) as Collaborator[];
      } catch (error: any) {
        console.error('Error searching users:', error);
        showError('Failed to search users: ' + error.message);
        return [];
      }
    },
    enabled: !!debouncedSearchTerm,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch collaborators for this note
  const { data: collaborators, isLoading: isLoadingCollaborators, refetch: refetchCollaborators, isError: isCollaboratorsError, error: collaboratorsError } = useQuery<Collaborator[], Error>({
    queryKey: ['collaborators', noteId],
    queryFn: async () => {
      console.log('Collaborators query function called.');
      if (!noteId) {
        console.log('Collaborators query: No noteId, returning empty array.');
        return [];
      }
      if (!isNoteOwner) {
        console.log('Collaborators query: Not note owner, skipping fetch for existing collaborators.');
        return []; // Only owner can see and manage collaborators
      }

      console.log('Collaborators query: Fetching basic collaborator entries for noteId:', noteId);
      const { data: basicCollaborators, error } = await supabase
        .from('collaborators')
        .select(`id, note_id, user_id, permission_level, created_at`)
        .eq('note_id', noteId);
      
      if (error) {
        console.error('Error fetching basic collaborators from Supabase:', error);
        throw error;
      }
      console.log('Raw basic collaborators data from Supabase:', basicCollaborators);

      if (!basicCollaborators || basicCollaborators.length === 0) {
        return [];
      }

      // Extract user IDs to fetch their full profiles
      const userIdsToFetch = basicCollaborators.map(collab => collab.user_id);
      console.log('Fetching full user details for IDs:', userIdsToFetch);

      try {
        const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/get-user-details-by-ids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userIds: userIdsToFetch }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user details for collaborators.');
        }
        const { users: userDetails } = await response.json();
        console.log('Fetched user details from Edge Function:', userDetails);

        // Map user details to a lookup object
        const userDetailsMap = new Map(userDetails.map((user: any) => [user.id, user]));

        // Combine basic collaborator data with full user details
        const combinedCollaborators = basicCollaborators.map(collab => {
          const details = userDetailsMap.get(collab.user_id);
          return {
            ...collab,
            first_name: details?.first_name || null,
            last_name: details?.last_name || null,
            avatar_url: details?.avatar_url || null,
            email: details?.email || null, // Now includes email
          };
        }) as Collaborator[];

        console.log('Combined collaborators data:', combinedCollaborators);
        return combinedCollaborators;

      } catch (fetchDetailsError: any) {
        console.error('Error fetching user details via Edge Function:', fetchDetailsError);
        showError('Failed to load collaborator details: ' + fetchDetailsError.message);
        // Return basic collaborators if details fetch fails, so at least something shows
        return basicCollaborators.map(collab => ({
          ...collab,
          first_name: null, last_name: null, avatar_url: null, email: null
        })) as Collaborator[];
      }
    },
    enabled: isOpen && !!noteId && isNoteOwner, // Only fetch collaborators if the current user is the note owner AND dialog is open
    staleTime: 60 * 1000,
  });

  // Debugging: Log collaborators query state
  useEffect(() => {
    console.log('Collaborators Query State:');
    console.log('  isLoadingCollaborators:', isLoadingCollaborators);
    console.log('  isCollaboratorsError:', isCollaboratorsError);
    if (isCollaboratorsError) {
      console.error('  Collaborators Error:', collaboratorsError);
    }
    console.log('  Collaborators data:', collaborators);
  }, [isLoadingCollaborators, isCollaboratorsError, collaboratorsError, collaborators]);


  // Update shareLink when isSharableLinkEnabled prop changes
  useEffect(() => {
    if (isSharableLinkEnabled) {
      setShareLink(`${window.location.origin}/dashboard/edit-note/${noteId}`);
    } else {
      setShareLink('');
    }
  }, [isSharableLinkEnabled, noteId]);

  const handleInternalToggleShareableLink = async (checked: boolean) => {
    setIsUpdatingShareLink(true);
    try {
      await onToggleShareableLink(checked); // Call the prop function
      showSuccess(`Shareable link ${checked ? 'enabled' : 'disabled'}!`);
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

  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ userId, permission }: { userId: string; permission: 'read' | 'write' }) => {
      setIsAddingCollaborator(true);
      const { data, error } = await supabase
        .from('collaborators')
        .insert({ note_id: noteId, user_id: userId, permission_level: permission })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Collaborator added successfully!');
      setSearchTerm('');
      setSelectedUser(null);
      refetchCollaborators(); // Refetch collaborators list
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes list to update shared status
    },
    onError: (error: any) => {
      console.error('Error adding collaborator:', error.message);
      showError('Failed to add collaborator: ' + error.message);
    },
    onSettled: () => {
      setIsAddingCollaborator(false);
    },
  });

  const updateCollaboratorPermissionMutation = useMutation({
    mutationFn: async ({ collaboratorId, permission }: { collaboratorId: string; permission: 'read' | 'write' }) => {
      const { data, error } = await supabase
        .from('collaborators')
        .update({ permission_level: permission })
        .eq('id', collaboratorId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      showSuccess('Permission updated successfully!');
      refetchCollaborators();
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error: any) => {
      console.error('Error updating permission:', error.message);
      showError('Failed to update permission: ' + error.message);
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Collaborator removed successfully!');
      refetchCollaborators();
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (error: any) => {
      console.error('Error removing collaborator:', error.message);
      showError('Failed to remove collaborator: ' + error.message);
    },
  });

  const handleAddCollaborator = () => {
    if (selectedUser) {
      // Check if the user is already a collaborator
      const isAlreadyCollaborator = collaborators?.some(
        (collab) => collab.user_id === selectedUser.id
      );

      if (isAlreadyCollaborator) {
        showError('This user is already a collaborator on this note.');
        return;
      }

      addCollaboratorMutation.mutate({ userId: selectedUser.id, permission: newPermissionLevel });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
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
              <Label htmlFor="share-link-toggle">Enable Public Shareable Link</Label>
              <Switch
                id="share-link-toggle"
                checked={isSharableLinkEnabled}
                onCheckedChange={handleInternalToggleShareableLink}
                disabled={isUpdatingShareLink || !isNoteOwner}
              />
            </div>

            {isSharableLinkEnabled && (
              <div className="space-y-2">
                <Label htmlFor="share-link">Public Share Link (Read-Only)</Label>
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
                  Anyone with this link can view the note.
                </p>
              </div>
            )}
          </div>

          {/* Collaborator Management Section (only for note owner) */}
          {isNoteOwner && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold">Collaborators</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-grow">
                  <Input
                    placeholder="Search users by email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedUser(null); // Clear selected user on new search
                    }}
                    disabled={isAddingCollaborator}
                  />
                  {isLoadingSearchResults && searchTerm && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {searchTerm && searchResults && searchResults.length > 0 && !selectedUser && (
                    <div className="absolute z-10 w-full bg-popover border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center p-2 cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setSelectedUser(user);
                            setSearchTerm(`${user.first_name || ''} ${user.last_name || ''} (${user.email})`.trim());
                          }}
                        >
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchTerm && !isLoadingSearchResults && searchResults?.length === 0 && !selectedUser && (
                    <div className="absolute z-10 w-full bg-popover border rounded-md shadow-lg mt-1 p-2 text-sm text-muted-foreground">
                      No users found.
                    </div>
                  )}
                </div>
                <Select value={newPermissionLevel} onValueChange={(value: 'read' | 'write') => setNewPermissionLevel(value)} disabled={!selectedUser || isAddingCollaborator}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Permission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="write">Write</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddCollaborator} disabled={!selectedUser || isAddingCollaborator}>
                  {isAddingCollaborator ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Add
                </Button>
              </div>

              {isLoadingCollaborators ? (
                <p className="text-muted-foreground">Loading collaborators...</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {collaborators && collaborators.length > 0 ? (
                    collaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={collab.avatar_url || undefined} />
                            <AvatarFallback>{(collab.first_name?.[0] || collab.email?.[0] || 'U').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {/* Display full name if both parts exist, otherwise just the available part, or fallback to email */}
                              {(collab.first_name || collab.last_name)
                                ? `${collab.first_name || ''} ${collab.last_name || ''}`.trim()
                                : collab.email || 'Unknown User'}
                            </p>
                            {/* Display email as a secondary line only if a name is also present and email is available */}
                            {(collab.first_name || collab.last_name) && collab.email && (
                              <p className="text-xs text-muted-foreground">{collab.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Select
                            value={collab.permission_level}
                            onValueChange={(value: 'read' | 'write') => updateCollaboratorPermissionMutation.mutate({ collaboratorId: collab.id, permission: value })}
                            disabled={updateCollaboratorPermissionMutation.isPending}
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                              <SelectValue />
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
                            disabled={removeCollaboratorMutation.isPending}
                          >
                            {removeCollaboratorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-destructive" />}
                            <span className="sr-only">Remove collaborator</span>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No collaborators added yet.</p>
                  )}
                </div>
              )}
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