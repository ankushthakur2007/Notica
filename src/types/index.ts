export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_sharable_link_enabled: boolean; // New property for shareable link status
  sharable_link_permission_level?: 'read' | 'write'; // New property for public link permission
}

export interface Collaborator {
  id: string;
  note_id: string;
  user_id: string;
  permission_level: 'read' | 'write';
  created_at: string;
  // Add profile details if needed for display, e.g., first_name, last_name, avatar_url
  // These would be fetched separately or joined in a view/function
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  email?: string; // Email from auth.users for display
}