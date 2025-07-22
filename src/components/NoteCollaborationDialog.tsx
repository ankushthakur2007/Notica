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
  isSharableLinkEnabled: boolean; // Current status of shareable link
  sharableLinkPermissionLevel: 'read' | 'write'; // Current permission level for shareable link
  onToggleShareableLink: (checked: boolean, permissionLevel: 'read' | 'write') => Promise<void>; // Updated prop for update function
  children?: React.ReactNode; // To allow DialogTrigger to be passed as a child
}

interface UserDetail {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const NoteCollaborationDialog = ({ noteId, isNoteOwner, isSharableLinkEnabled, sharableLinkPermissionLevel, onToggleShareableLink, children }: ShareNoteDialogProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isUpdatingShareLink, setIsUpdatingShareLink] = useState(false);
  const [publicLinkPermission, setPublicLinkPermission] = useState<'read' | 'write'>(sharableLinkPermissionLevel);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedUser, setSelectedUser] = useState<Collaborator | null>(null);
  const [newPermissionLevel, setNewPermissionLevel] = useState<'read' | 'write'>('read');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  // Update internal state when props change
  useEffect(() => {
    setPublicLinkPermission(sharableLinkPermissionLevel);
  }, [sharableLinkPermissionLevel]);

  // Debugging: Log the props received when the dialog opens
  useEffect(() => {
    if (isOpen) {
      console.log('NoteCollaborationDialog opened. Props:');
      console.log('  noteId:', noteId);
      console.log('  isNoteOwner:', isNoteOwner);
      console.log('  isSharableLinkEnabled:', isSharableLinkEnabled);
      console.log('  sharableLinkPermissionLevel:', sharableLinkPermissionLevel);
    }
  }, [isOpen, noteId, isNoteOwner, isSharableLinkEnabled, sharableLinkPermissionLevel]);

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
        const data: { profiles: UserDetail[] } = await response.json();
        return data.profiles.map((profile) => ({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url,
          email: profile.email,
        })) as Collaborator[];
      } catch (error: any) {
        console.error('Error searching users:', error);
        // Removed: showError('Failed to search users: ' + error.message);
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
        const { users: userDetails }: { users: UserDetail[] } = await response.json();
        console.log('Fetched user details from Edge Function:', userDetails);

        // Map user details to a lookup object
        const userDetailsMap = new Map<string, UserDetail>(userDetails.map((user) => [user.id, user]));

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
        // Removed: showError('Failed to load collaborator details: ' + fetchDetailsError.message);
        // Return basic collaborators if details fetch fails, so at least something shows
        return basicCollaborators.map(collab => ({
          ...collab,
          first_name: undefined, last_name: undefined, avatar_url: null, email: undefined
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
    console.log(`Attempting to toggle shareable link: checked=${checked}, permissionLevel=${publicLinkPermission}`);
    setIsUpdatingShareLink(true);
    try {
      // Pass both checked status and the current publicLinkPermission
      await onToggleShareableLink(checked, publicLinkPermission); 
      showSuccess(`Shareable link ${checked ? 'enabled' : 'disabled'} with ${publicLinkPermission} permission.`);
    } catch (error: any) {
      console.error('Error updating shareable link status:', error.message);
      showError('Failed to update shareable link status: ' + error.message);
    } finally {
      setIsUpdatingShareLink(false);
    }
  };

  const handlePublicLinkPermissionChange = async (value: 'read' | 'write') => {
    console.log(`Attempting to change public link permission to: ${value}. Current shareable link enabled: ${isSharableLinkEnabled}`);
    setPublicLinkPermission(value);
    // If the shareable link is already enabled, update its permission level immediately
    if (isSharableLinkEnabled) {
      setIsUpdatingShareLink(true);
      try {
        await onToggleShareableLink(true, value); // Keep enabled, just change permission
        showSuccess(`Public link permission set to ${value}.`);
      } catch (error: any) {
        console.error('Error updating public link permission:', error.message);
        showError('Failed to update public link permission: ' + error.message);
      } finally {
        setIsUpdatingShareLink(false);
      }
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) {
      showError('No link to copy.');
      console.error('Attempted to copy empty shareLink.');
      return;
    }

    console.log('Attempting to copy link:', shareLink);

    try {
      await navigator.clipboard.writeText(shareLink);
      showSuccess('Share link copied to clipboard!'); // Re-enabled success toast
      console.log('Successfully copied using Clipboard API.');
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
        showSuccess('Share link copied to clipboard (fallback)!'); // Re-enabled success toast
        console.log('Successfully copied using execCommand fallback.');
      } catch (execErr) {
        console.error('Fallback copy failed:', execErr);
        showError('Failed to copy link to clipboard. Please copy it manually.');
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // Removed addCollaboratorMutation, updateCollaboratorPermissionMutation, removeCollaboratorMutation
  // Removed handleAddCollaborator

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
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
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="public-link-permission">Public Link Permission</Label>
                  <Select
                    value={publicLinkPermission}
                    onValueChange={handlePublicLinkPermissionChange}
                    disabled={isUpdatingShareLink || !isNoteOwner}
                  >
                    <SelectTrigger className="w-[120px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read-Only</SelectItem>
                      <SelectItem value="write">Editable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Label htmlFor="share-link">Public Share Link</Label>
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
                  Anyone with this link can {publicLinkPermission === 'write' ? 'view and edit' : 'view'} the note.
                </p>
              </div>
            )}
          </div>

          {/* Collaborator Management Section (removed) */}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteCollaborationDialog;