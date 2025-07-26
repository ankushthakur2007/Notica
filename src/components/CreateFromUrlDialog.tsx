import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface CreateFromUrlDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const CreateFromUrlDialog = ({ isOpen, onOpenChange }: CreateFromUrlDialogProps) => {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!user) {
      showError('You must be logged in.');
      return;
    }
    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(url)) {
      setError('Please enter a valid YouTube URL.');
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('summarize-youtube-video', {
        body: { youtubeUrl: url, userId: user.id },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      showSuccess('Note created successfully!');
      onOpenChange(false);
      setUrl('');
      navigate(`/dashboard/edit-note/${data.noteId}`);

    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
      showError(`Failed to create note: ${e.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Note from YouTube URL</DialogTitle>
          <DialogDescription>
            Paste a YouTube video URL below. We'll fetch the transcript and create an AI-powered summary for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="youtube-url" className="text-right">
              URL
            </Label>
            <Input
              id="youtube-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://www.youtube.com/watch?v=..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleGenerate} disabled={isCreating}>
            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isCreating ? 'Generating...' : 'Generate Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFromUrlDialog;