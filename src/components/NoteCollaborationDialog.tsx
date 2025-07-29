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
  isSharableLinkEnabled: boolean;
  sharableLinkPermissionLevel: 'read' | 'write';
  onToggleShareableLink: (checked: boolean, permissionLevel: 'read' | 'write') => Promise<void>;
  children?: React.ReactNode;
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
  const [newPermissionLevel, setNewPermissionLevel] = useState<'read' | 'write'>('read');

  useEffect(() => {
    setPublicLinkPermission(sharableLinkPermissionLevel);
  }, [sharableLinkPermissionLevel]);

  useEffect(() => {
    if (isSharableLinkEnabled) {
      setShareLink(`${window.location.origin}/dashboard/edit-note/${noteId}`);
    } else {
      setShareLink('');
    }
  }, [isSharableLinkEnabled, noteId]);

  const { data: collaborators, isLoading: isLoadingCollaborators, refetch: refetchCollaborators } = useQuery<Collaborator[], Error>({
    queryKey: ['collaborators', noteId],
    queryFn: async () => {
      if (!noteId || !isNoteOwner) return [];
      const { data: basicCollaborators, error } = await supabase.from('collaborators').select(`id, note_id, user_id, permission_level, created_at`).eq('note_id', noteId);
      if (error) throw error;
      if (!basicCollaborators || basicCollaborators.length === 0) return [];
      const userIdsToFetch = basicCollaborators.map(collab => collab.user_id);
      const response = await fetch('https://yibrrjblxuoebnecbntp.supabase.co/functions/v1/get-user-details-by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: userIdsToFetch }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch user details.');
      const { users: userDetails }: { users: UserDetail[] } = await response.json();
      const userDetailsMap = new Map<string, UserDetail>(userDetails.map((user) => [user.id, user]));
      return basicCollaborators.map(collab => ({ ...collab, ...userDetailsMap.get(collab.user_id) })) as Collaborator[];
    },
    enabled: isOpen && !!noteId && isNoteOwner,
    staleTime: 60 * 1000,
  });

  const addCollaboratorMutation = useMutation({
    mutationFn: async ({ email, permission_level }: { email: string; permission_level: 'read' | 'write' }) => {
      const { error } = await supabase.functions.invoke('add-collaborator', {
        body: { note_id: noteId, email, permission_level },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess('Collaborator added!');
      refetchCollaborators();
      setSearchTerm('');
    },
    onError: (error: any) => {
      showError(`Failed to add collaborator: ${error.message}`);
    },
  });

  const updateCollaboratorPermissionMutation = useMutation({
    mutationFn: async ({ collaboratorId, permissionLevel }: { collaboratorId: string, permissionLevel: 'read' | 'write' }) => {
      const { error } = await supabase.from('collaborators').update({ permission_level: permissionLevel }).eq('id', collaboratorId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Permission updated.');
      refetchCollaborators();
    },
    onError: (error: any) => {
      showError(`Failed to update permission: ${error.message}`);
    },
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase.from('collaborators').delete().eq('id', collaboratorId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Collaborator removed.');
      refetchCollaborators();
    },
    onError: (error: any) => {
      showError(`Failed to remove collaborator: ${error.message}`);
    },
  });

  const handleAddCollaborator = () => {
    if (searchTerm.trim()) {
      addCollaboratorMutation.mutate({ email: searchTerm.trim(), permission_level: newPermissionLevel });
    } else {
      showError('Please enter a user email to add.');
    }
  };

  const handleInternalToggleShareableLink = async (checked: boolean) => {
    setIsUpdatingShareLink(true);
    try {
      await onToggleShareableLink(checked, publicLinkPermission);
      showSuccess(`Shareable link ${checked ? 'enabled' : 'disabled'}.`);
    } catch (error: any) {
      showError('Failed to update shareable link status: ' + error.message);
    } finally {
      setIsUpdatingShareLink(false);
    }
  };

  const handlePublicLinkPermissionChange = async (value: 'read' | 'write') => {
    setPublicLinkPermission(value);
    if (isSharableLinkEnabled) {
      setIsUpdatingShareLink(true);
      try {
        await onToggleShareableLink(true, value);
        showSuccess(`Public link permission set to ${value}.`);
      } catch (error: any) {
        showError('Failed to update public link permission: ' + error.message);
      } finally {
        setIsUpdatingShareLink(false);
      }
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      showSuccess('Share link copied to clipboard!');
    } catch (err) {
      showError('Failed to copy link.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline" size="sm"><Share2 className="h-4 w-4 mr-2" />Share</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>Manage sharing and collaboration for this note.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {isNoteOwner && (
            <div className="space-y-4">
              <Label htmlFor="user-search">Add Collaborator by Email</Label>
              <div className="flex space-x-2">
                <Input id="user-search" placeholder="Enter user's email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={!isNoteOwner || addCollaboratorMutation.isLoading} />
                <Select value={newPermissionLevel} onValueChange={(value: 'read' | 'write') => setNewPermissionLevel(value)} disabled={!isNoteOwner}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read-Only</SelectItem>
                    <SelectItem value="write">Editable</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddCollaborator} disabled={!searchTerm.trim() || addCollaboratorMutation.isLoading}>
                  {addCollaboratorMutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                </Button>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Collaborators</h3>
                {isLoadingCollaborators ? <p className="text-sm text-muted-foreground">Loading...</p> : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {collaborators && collaborators.length > 0 ? collaborators.map(c => (
                      <div key={c.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarImage src={c.avatar_url || undefined} /><AvatarFallback>{c.email?.[0].toUpperCase()}</AvatarFallback></Avatar>
                          <div>
                            <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={c.permission_level} onValueChange={(value: 'read' | 'write') => updateCollaboratorPermissionMutation.mutate({ collaboratorId: c.id, permissionLevel: value })}>
                            <SelectTrigger className="w-[120px] h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read">Read-Only</SelectItem>
                              <SelectItem value="write">Editable</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" onClick={() => removeCollaboratorMutation.mutate(c.id)}><XCircle className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">No collaborators yet.</p>}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="share-link-toggle">Enable Public Shareable Link</Label>
              <Switch id="share-link-toggle" checked={isSharableLinkEnabled} onCheckedChange={handleInternalToggleShareableLink} disabled={isUpdatingShareLink || !isNoteOwner} />
            </div>
            {isSharableLinkEnabled && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="public-link-permission">Public Link Permission</Label>
                  <Select value={publicLinkPermission} onValueChange={handlePublicLinkPermissionChange} disabled={isUpdatingShareLink || !isNoteOwner}>
                    <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read-Only</SelectItem>
                      <SelectItem value="write">Editable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Label htmlFor="share-link">Public Share Link</Label>
                <div className="flex space-x-2">
                  <Input id="share-link" value={shareLink} readOnly className="flex-grow" />
                  <Button onClick={handleCopyLink} disabled={!shareLink}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-sm text-muted-foreground">Anyone with this link can {publicLinkPermission === 'write' ? 'view and edit' : 'view'} the note.</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteCollaborationDialog;