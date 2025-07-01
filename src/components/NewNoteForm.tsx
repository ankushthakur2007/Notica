import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useSessionContext } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for local IDs

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
});

const NOTE_CACHE_PREFIX = 'notica-note-cache-'; // Ensure this matches NoteEditor

const NewNoteForm = ({ onNoteCreated }: { onNoteCreated: () => void }) => {
  const { user } = useSessionContext();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // For now, new notes are always created locally first.
    // The user will explicitly save to Supabase from the editor.
    try {
      const localNoteId = `local-${uuidv4()}`; // Create a unique ID for local notes
      const newLocalNote = {
        id: localNoteId,
        user_id: user?.id || 'anonymous', // Assign 'anonymous' if user is not logged in
        title: values.title,
        content: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_sharable_link_enabled: false,
        sharable_link_permission_level: 'read',
      };

      localStorage.setItem(`${NOTE_CACHE_PREFIX}${localNoteId}`, JSON.stringify(newLocalNote));
      console.log('📝 New note created locally:', newLocalNote);

      form.reset();
      onNoteCreated(); // Callback to notify parent component (e.g., to invalidate queries)
      navigate(`/dashboard/edit-note/${localNoteId}`); // Navigate to the new local note's editor
    } catch (error: any) {
      console.error('Error creating local note:', error);
      showError('Failed to create note locally: ' + error.message);
    }
  };

  return (
    <div className="p-6 bg-card rounded-lg shadow-md w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Create New Note</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Title</FormLabel>
                <FormControl>
                  <Input placeholder="My awesome note" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full">Create Note</Button>
        </form>
      </Form>
    </div>
  );
};

export default NewNoteForm;