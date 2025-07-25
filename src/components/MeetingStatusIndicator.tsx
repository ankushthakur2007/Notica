import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, BrainCircuit, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Status = 'transcribing' | 'analyzing' | 'completed' | 'failed';

interface MeetingStatusIndicatorProps {
  status: Status;
}

const steps = [
  { name: 'Transcribing', status: 'transcribing', icon: FileText },
  { name: 'Analyzing', status: 'analyzing', icon: BrainCircuit },
  { name: 'Completed', status: 'completed', icon: CheckCircle },
];

const MeetingStatusIndicator = ({ status }: MeetingStatusIndicatorProps) => {
  if (status === 'failed') {
    return (
      <div className="flex items-center space-x-2 text-destructive">
        <XCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Processing Failed</span>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex(step => step.status === status);

  return (
    <div className="flex w-full items-center px-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        
        return (
          <React.Fragment key={step.name}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  isCurrent ? 'bg-primary/90 text-primary-foreground' : '',
                  status === 'completed' && 'bg-primary text-primary-foreground'
                )}
              >
                {isCurrent && status !== 'completed' ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <step.icon className="h-6 w-6" />
                )}
              </div>
              <p className={cn(
                "text-xs font-medium transition-colors",
                isCurrent || isCompleted || status === 'completed' ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {step.name}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-1 rounded-full mx-2 transition-colors",
                isCompleted || status === 'completed' ? 'bg-primary' : 'bg-muted'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default MeetingStatusIndicator;