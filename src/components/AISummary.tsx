import React from 'react';
import { Meeting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckSquare, Target } from 'lucide-react';

interface AISummaryProps {
  meeting: Meeting;
}

const AISummary = ({ meeting }: AISummaryProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{meeting.summary || "No summary available."}</p>
        </CardContent>
      </Card>
      
      <Accordion type="multiple" defaultValue={['action-items', 'key-decisions']} className="w-full">
        <AccordionItem value="action-items">
          <AccordionTrigger className="text-lg font-semibold">Action Items</AccordionTrigger>
          <AccordionContent>
            {meeting.action_items && meeting.action_items.length > 0 ? (
              <ul className="list-none space-y-2 pt-2">
                {meeting.action_items.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckSquare className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted-foreground">No action items identified.</p>}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="key-decisions">
          <AccordionTrigger className="text-lg font-semibold">Key Decisions</AccordionTrigger>
          <AccordionContent>
            {meeting.key_decisions && meeting.key_decisions.length > 0 ? (
              <ul className="list-none space-y-2 pt-2">
                {meeting.key_decisions.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <Target className="h-5 w-5 mr-3 mt-1 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted-foreground">No key decisions identified.</p>}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default AISummary;