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
import { Switch } from '@/components/ui/switch'; // Import Switch component
import { Input } from '@/components/ui/input'; // Import Input for displaying the link
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Share2, Copy, Loader2 } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Note } from '@/types'; // Import Note type

interface ShareNoteDialogProps {
  noteId: string;
}

const ShareNoteDialog = ({ noteId }: ShareNoteDialogProps) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isSharableLinkEnabled, setIsSharableLinkEnabled] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
    enabled: isOpen && !!noteId, // Only fetch when dialog is open and noteId is available
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
    setIsUpdating(true);
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
      queryClient.invalidateQueries({ queryKey: ['note', noteId] }); // Invalidate specific note query
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // Invalidate notes list to reflect changes
    } catch (error: any) {
      console.error('Error updating shareable link status:', error.message);
      showError('Failed to update shareable link status: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) {
      showError('No link to copy.');
      return;
    }

    try {
      // Attempt to use the modern Clipboard API first
      await navigator.clipboard.writeText(shareLink);
      showSuccess('Share link copied to clipboard!');
    } catch (err: any) {
      console.warn('Failed to copy using Clipboard API, falling back to execCommand:', err);
      // Fallback for insecure contexts or older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareLink;
      textarea.style.position = 'fixed'; // Prevent scrolling to bottom of page in iOS.
      textarea.style.opacity = '0'; // Hide the textarea
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
          <DialogDescription>
            Manage public sharing for this note. Anyone with the link will have read-only access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="share-link-toggle">Enable Shareable Link</Label>
            <Switch
              id="share-link-toggle"
              checked={isSharableLinkEnabled}
              onCheckedChange={handleToggleShareableLink}
              disabled={isUpdating || isLoadingNote}
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareNoteDialog;