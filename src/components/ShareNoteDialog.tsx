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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { User, XCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Collaborator {
  id: string;
  user_id: string;
  permission_level: 'read' | 'write';
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ShareNoteDialogProps {
  noteId: string;
  noteOwnerId: string;
  isOwner: boolean;
}

const ShareNoteDialog = ({ noteId, noteOwnerId, isOwner }: ShareNoteDialogProps) => {
  const queryClient = useQueryClient();
  const [emailToShare, setEmailToShare] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'write'>('read');
  const [isAddingCollaborator, setIsAddingCollaborator] = useState(false);

  const { data: collaborators, isLoading, isError, error, refetch } = useQuery<Collaborator[], Error>({
    queryKey: ['collaborators', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select(`
          id,
          user_id,
          permission_level,
          profiles (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('note_id', noteId);

      if (error) {
        throw error;
      }
      return data as Collaborator[];
    },
    enabled: !!noteId,
  });

  useEffect(() => {
    if (isError) {
      showError('Failed to load collaborators: ' + error?.message);
    }
  }, [isError, error]);

  const handleAddCollaborator = async () => {
    if (!emailToShare) {
      showError('Please enter an email address.');
      return;
    }

    setIsAddingCollaborator(true);
    try {
      // 1. Find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailToShare) // Assuming email is stored in profiles table or can be queried from auth.users
        .single();

      if (userError || !userData) {
        throw new Error('User with this email not found or profile not set up.');
      }

      const collaboratorUserId = userData.id;

      // 2. Check if already a collaborator
      if (collaborators?.some(c => c.user_id === collaboratorUserId)) {
        showError('This user is already a collaborator.');
        return;
      }

      // 3. Add the collaborator
      const { error: insertError } = await supabase
        .from('collaborators')
        .insert({
          note_id: noteId,
          user_id: collaboratorUserId,
          permission_level: permissionLevel,
        });

      if (insertError) {
        throw insertError;
      }

      showSuccess('Collaborator added successfully!');
      setEmailToShare('');
      setPermissionLevel('read');
      refetch(); // Refresh the list of collaborators
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes list to reflect shared status
    } catch (error: any) {
      console.error('Error adding collaborator:', error);
      showError('Failed to add collaborator: ' + error.message);
    } finally {
      setIsAddingCollaborator(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!isOwner) {
      showError('Only the note owner can remove collaborators.');
      return;
    }
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        throw error;
      }
      showSuccess('Collaborator removed successfully!');
      refetch(); // Refresh the list
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    } catch (error: any) {
      console.error('Error removing collaborator:', error);
      showError('Failed to remove collaborator: ' + error.message);
    }
  };

  const handlePermissionChange = async (collaboratorId: string, newPermission: 'read' | 'write') => {
    if (!isOwner) {
      showError('Only the note owner can change permissions.');
      return;
    }
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ permission_level: newPermission })
        .eq('id', collaboratorId);

      if (error) {
        throw error;
      }
      showSuccess('Permission updated!');
      refetch();
    } catch (error: any) {
      console.error('Error updating permission:', error);
      showError('Failed to update permission: ' + error.message);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!isOwner}>
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            {isOwner ? "Add or manage collaborators for this note." : "View collaborators for this note."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isOwner && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="collaborator@example.com"
                className="col-span-2"
                value={emailToShare}
                onChange={(e) => setEmailToShare(e.target.value)}
                disabled={isAddingCollaborator}
              />
              <Select value={permissionLevel} onValueChange={(value: 'read' | 'write') => setPermissionLevel(value)} disabled={isAddingCollaborator}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Permission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Write</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isOwner && (
            <Button onClick={handleAddCollaborator} disabled={isAddingCollaborator}>
              {isAddingCollaborator ? 'Adding...' : 'Add Collaborator'}
            </Button>
          )}

          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Current Collaborators</h3>
            {isLoading ? (
              <p className="text-muted-foreground">Loading collaborators...</p>
            ) : (
              <ul className="space-y-2">
                {collaborators?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No collaborators yet.</p>
                ) : (
                  collaborators?.map((collab) => (
                    <li key={collab.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          {collab.profiles?.avatar_url ? (
                            <img src={collab.profiles.avatar_url} alt="Avatar" />
                          ) : (
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <span>
                          {collab.profiles?.first_name || 'Unknown'} {collab.profiles?.last_name || 'User'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {isOwner ? (
                          <Select value={collab.permission_level} onValueChange={(value: 'read' | 'write') => handlePermissionChange(collab.id, value)}>
                            <SelectTrigger className="w-[100px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="read">Read</SelectItem>
                              <SelectItem value="write">Write</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground capitalize">{collab.permission_level}</span>
                        )}
                        {isOwner && (
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(collab.id)}>
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setEmailToShare('')}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareNoteDialog;