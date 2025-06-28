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
import { Share2, Copy, Loader2 } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Note } from '@/types';

interface ShareNoteDialogProps {
  noteId: string;
}

const NoteCollaborationDialog = ({ noteId }: ShareNoteDialogProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSharableLinkEnabled, setIsSharableLinkEnabled] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isUpdatingShareLink, setIsUpdatingShareLink] = useState(false);

  // Fetch the current note's sharable link status
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share Note</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[475px]">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            Manage sharing for this note.
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
                disabled={isUpdatingShareLink || isLoadingNote}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoteCollaborationDialog;