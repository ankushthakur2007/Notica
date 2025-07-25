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

// A type for the processed transcript chunk
interface TranscriptChunk {
  startTime: number;
  speakerGroups: {
    speaker: number;
    text: string;
  }[];
}

const TranscriptDisplay = ({ transcript }: TranscriptDisplayProps) => {
  // Deepgram's response structure for words with diarization
  const words = transcript?.results?.channels?.[0]?.alternatives?.[0]?.words;

  // Fallback for old text-based transcripts or if the detailed words array is missing
  if (!words || words.length === 0) {
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

  // Process words into 5-second chunks
  const chunks = words.reduce((acc, word) => {
    const intervalStart = Math.floor(word.start / 5) * 5;
    if (!acc[intervalStart]) {
      acc[intervalStart] = [];
    }
    acc[intervalStart].push(word);
    return acc;
  }, {} as Record<number, any[]>);

  // Group words within each chunk by speaker
  const processedChunks: TranscriptChunk[] = Object.entries(chunks).map(([startTimeStr, wordsInChunk]) => {
    const startTime = parseInt(startTimeStr, 10);
    const speakerGroups: { speaker: number; text: string }[] = [];
    
    if (wordsInChunk.length > 0) {
      let currentSpeaker = wordsInChunk[0].speaker;
      let currentText = '';

      wordsInChunk.forEach((word, index) => {
        // Use punctuated_word for better formatting, fallback to word
        const wordText = word.punctuated_word || word.word;

        if (word.speaker === currentSpeaker) {
          currentText += wordText + ' ';
        } else {
          // New speaker found, push the previous group
          speakerGroups.push({ speaker: currentSpeaker, text: currentText.trim() });
          // Start a new group
          currentSpeaker = word.speaker;
          currentText = wordText + ' ';
        }

        // Push the last group when the chunk ends
        if (index === wordsInChunk.length - 1) {
          speakerGroups.push({ speaker: currentSpeaker, text: currentText.trim() });
        }
      });
    }

    return { startTime, speakerGroups };
  });

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-3 text-foreground">Full Transcript</h2>
      <div className="space-y-4">
        {processedChunks.map((chunk) => (
          <div key={chunk.startTime} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30">
            <div className="text-sm font-mono text-muted-foreground pt-1 w-16 flex-shrink-0">
              {formatTimestamp(chunk.startTime)}
            </div>
            <div className="flex-grow space-y-2">
              {chunk.speakerGroups.map((group, index) => (
                <div key={index}>
                  <p className="font-bold text-primary mb-1">Speaker {group.speaker + 1}</p>
                  <p className="text-foreground leading-relaxed">{group.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptDisplay;