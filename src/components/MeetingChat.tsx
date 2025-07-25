import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { showError } from '@/utils/toast';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface MeetingChatProps {
  meetingId: string;
  initialMessages: Message[];
}

const MeetingChat = ({ meetingId, initialMessages }: MeetingChatProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-meeting', {
        body: { meetingId, userQuestion: input },
      });

      if (error) throw error;

      const aiMessage: Message = { sender: 'ai', text: data.answer };
      const finalMessages = [...updatedMessagesWithUser, aiMessage];
      setMessages(finalMessages);

      // Save the complete history to DB
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ chat_history: finalMessages })
        .eq('id', meetingId);

      if (updateError) {
        showError('Failed to save chat history.');
        console.error(updateError);
      }

    } catch (error: any) {
      const errorMessage: Message = { sender: 'ai', text: `Sorry, I encountered an error: ${error.message}` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 dark:bg-black/20">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-center text-foreground">Chat with Meeting</h3>
      </div>
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && <Avatar className="h-8 w-8"><AvatarFallback>AI</AvatarFallback></Avatar>}
              <div className={`rounded-lg px-3 py-2 max-w-[85%] break-words ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2 justify-start">
              <Avatar className="h-8 w-8"><AvatarFallback>AI</AvatarFallback></Avatar>
              <div className="rounded-lg px-3 py-2 bg-card flex items-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-border/50 bg-background/50">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the meeting..."
            disabled={isLoading}
            autoComplete="off"
            className="bg-card border-border"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default MeetingChat;