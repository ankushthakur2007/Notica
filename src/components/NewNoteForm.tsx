import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useSessionContext } from '@/contexts/SessionContext';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const formSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
});

const NewNoteForm = ({ onNoteCreated }: { onNoteCreated: () => void }) => {
  const { user } = useSessionContext();
  const navigate = useNavigate(); // Initialize useNavigate
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      showError('You must be logged in to create a note.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: values.title,
          content: '', // Initialize with empty content
        })
        .select('id') // Select the ID of the newly created note
        .single();

      if (error) {
        throw error;
      }

      // Removed: showSuccess('Note created successfully! Redirecting to editor...');
      form.reset();
      onNoteCreated(); // Callback to notify parent component (e.g., to invalidate queries)
      navigate(`/dashboard/edit-note/${data.id}`); // Navigate to the new note's editor
    } catch (error: any) {
      console.error('Error creating note:', error);
      showError('Failed to create note: ' + error.message);
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