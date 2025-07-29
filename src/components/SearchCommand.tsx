import React, { useState, useEffect } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { File, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  id: string;
  title: string;
}

export const SearchCommand = () => {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "o" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (search.trim().length < 2) {
        setResults([]);
        return;
      }
      if (!user) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-notes', {
          body: { query: search, userId: user.id },
        });
        if (error) throw error;
        setResults(data || []);
      } catch (e) {
        console.error("Search failed:", e);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debouncedSearch = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(debouncedSearch);
  }, [search, user]);

  const onSelect = (noteId: string) => {
    navigate(`/dashboard/edit-note/${noteId}`);
    setIsOpen(false);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput
        placeholder="Search your notes..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {isLoading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Searching...</span>
          </div>
        ) : (
          <CommandGroup heading="Documents">
            {results.map((doc) => (
              <CommandItem
                key={doc.id}
                value={doc.id}
                title={doc.title}
                onSelect={() => onSelect(doc.id)}
              >
                <File className="mr-2 h-4 w-4" />
                <span>{doc.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};