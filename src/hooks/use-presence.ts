import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/stores/appStore';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresentUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email?: string;
}

export const usePresence = (noteId: string | undefined) => {
  const { user } = useAppStore();
  const [presentUsers, setPresentUsers] = useState<PresentUser[]>([]);

  useEffect(() => {
    if (!noteId || !user) return;

    const channelName = `note:${noteId}`;
    const channel: RealtimeChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, async () => {
      const presenceState = channel.presenceState();
      const userIds = Object.keys(presenceState);
      
      if (userIds.length > 0) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);
        
        if (error) {
          console.error("Error fetching presence profiles:", error);
          setPresentUsers([]);
          return;
        }

        const usersWithDetails = profiles.map(profile => {
            const presenceInfo = (presenceState[profile.id] as any[])[0];
            return {
                ...profile,
                email: presenceInfo?.email || 'N/A'
            };
        });

        setPresentUsers(usersWithDetails);
      } else {
        setPresentUsers([]);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          email: user.email,
        });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [noteId, user]);

  return { presentUsers };
};