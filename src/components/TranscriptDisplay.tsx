import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TranscriptDisplayProps {
  transcript: string;
}

const TranscriptDisplay = ({ transcript }: TranscriptDisplayProps) => {
  return (
    <Card className="flex-grow flex flex-col mt-6">
      <CardHeader>
        <CardTitle>Full Transcript</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <ScrollArea className="h-[400px] w-full rounded-md border p-4 whitespace-pre-wrap">
          {transcript || "No transcript available."}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TranscriptDisplay;