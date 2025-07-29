import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PresentUser } from '@/hooks/use-presence';

interface PresenceAvatarsProps {
  users: PresentUser[];
  selfId?: string;
}

const PresenceAvatars = ({ users, selfId }: PresenceAvatarsProps) => {
  const otherUsers = users.filter(u => u.id !== selfId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center -space-x-2">
        {otherUsers.slice(0, 3).map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 border-2 border-background">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.first_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.first_name} {user.last_name || ''}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {otherUsers.length > 3 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                +{otherUsers.length - 3}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{otherUsers.length - 3} more users online</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PresenceAvatars;