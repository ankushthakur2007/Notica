import React from 'react';

interface TranscriptDisplayProps {
  transcript: any; // The full JSON object from Deepgram
}

const formatTimestamp = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const TranscriptDisplay = ({ transcript }: TranscriptDisplayProps) => {
  const utterances = transcript?.results?.channels?.[0]?.alternatives?.[0]?.utterances;

  if (!utterances || utterances.length === 0) {
    // Fallback for old text-based transcripts or empty transcripts
    const plainText = typeof transcript === 'string' ? transcript : transcript?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-3 text-foreground">Full Transcript</h2>
        <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-4 rounded-lg">
          {plainText || "No transcript available."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-3 text-foreground">Full Transcript</h2>
      <div className="space-y-4">
        {utterances.map((utterance: any, index: number) => (
          <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
            <div className="text-sm font-mono text-muted-foreground pt-1 w-16 flex-shrink-0">
              {formatTimestamp(utterance.start)}
            </div>
            <div className="flex-grow">
              <p className="font-bold text-primary mb-1">Speaker {utterance.speaker + 1}</p>
              <p className="text-foreground leading-relaxed">{utterance.transcript}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptDisplay;