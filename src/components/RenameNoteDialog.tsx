import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';

interface RenameNoteDialogProps {
  currentTitle: string;
  onRename: (newTitle: string) => void;
  children: React.ReactNode; // To allow DialogTrigger (e.g., a Button) to be passed as a child
}

const RenameNoteDialog = ({ currentTitle, onRename, children }: RenameNoteDialogProps) => {
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isOpen, setIsOpen] = useState(false);

  // Update internal state if currentTitle prop changes (e.g., when a different note is loaded)
  useEffect(() => {
    setNewTitle(currentTitle);
  }, [currentTitle]);

  const handleSave = () => {
    if (newTitle.trim() === '') {
      showError('Note title cannot be empty.');
      return;
    }
    if (newTitle === currentTitle) {
      // Removed: showSuccess('No changes made to the title.');
      setIsOpen(false);
      return;
    }
    onRename(newTitle);
    // Removed: showSuccess('Note title updated locally!');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rename Note</DialogTitle>
          <DialogDescription>
            Enter a new title for your note. Changes will be saved when you close the note.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="note-title" className="text-right">
              Title
            </Label>
            <Input
              id="note-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Prevent form submission
                  handleSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSave} variant="outline">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameNoteDialog;