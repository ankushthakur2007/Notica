export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_sharable_link_enabled: boolean; // New property for shareable link status
}