import React from 'react';
import { Meeting } from '@/types';
import { CheckSquare, Target } from 'lucide-react';

interface AISummaryProps {
  meeting: Meeting;
}

const AISummary = ({ meeting }: AISummaryProps) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-3 text-foreground">Summary</h2>
        <p className="text-muted-foreground leading-relaxed">{meeting.summary || "No summary available."}</p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-3 text-foreground">Action Items</h2>
        {meeting.action_items && meeting.action_items.length > 0 ? (
          <ul className="list-none space-y-2">
            {meeting.action_items.map((item, index) => (
              <li key={index} className="flex items-start">
                <CheckSquare className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">No action items identified.</p>}
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-3 text-foreground">Key Decisions</h2>
        {meeting.key_decisions && meeting.key_decisions.length > 0 ? (
          <ul className="list-none space-y-2">
            {meeting.key_decisions.map((item, index) => (
              <li key={index} className="flex items-start">
                <Target className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">No key decisions identified.</p>}
      </div>
    </div>
  );
};

export default AISummary;