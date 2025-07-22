import React from 'react';
import NoteEditor from '@/components/NoteEditor';

const NoteEditorPage = () => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-200/50 dark:bg-purple-500/30 rounded-full filter blur-3xl animate-float-1 [will-change:transform]"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-200/50 dark:bg-blue-500/30 rounded-full filter blur-3xl animate-float-2 [will-change:transform]"></div>
      </div>
      <div className="relative z-10 h-screen flex flex-col">
        <NoteEditor />
      </div>
    </div>
  );
};

export default NoteEditorPage;