import React from 'react';

interface TranscriptDisplayProps {
  transcript: string;
}

const TranscriptDisplay = ({ transcript }: TranscriptDisplayProps) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-3 text-foreground">Full Transcript</h2>
      <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-lg">
        {transcript || "No transcript available."}
      </div>
    </div>
  );
};

export default TranscriptDisplay;