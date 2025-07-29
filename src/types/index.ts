export interface Profile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
  is_sharable_link_enabled: boolean;
  sharable_link_permission_level?: 'read' | 'write';
  permission_level?: 'read' | 'write';
  profiles?: Profile; // For note owner's profile
}

export interface Collaborator {
  id: string;
  note_id: string;
  user_id: string;
  permission_level: 'read' | 'write';
  created_at: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  email?: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  audio_url: string | null;
  status: 'transcribing' | 'analyzing' | 'completed' | 'failed';
  transcript: any | null;
  summary: string | null;
  action_items: string[] | null;
  key_decisions: string[] | null;
  chat_history?: { sender: 'user' | 'ai'; text: string }[] | null;
}

export interface Comment {
  id: string;
  created_at: string;
  note_id: string;
  user_id: string;
  content: string;
  highlighted_text: string | null;
  is_resolved: boolean;
  parent_comment_id: string | null;
  profiles: Profile | null;
  replies?: Comment[];
}