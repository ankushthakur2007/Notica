import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';

const SkeletonMeetingCard = () => {
  return (
    <Card className="flex flex-col justify-between bg-card/50 dark:bg-gray-900/50 border border-border/50 backdrop-blur-md">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center min-h-[100px]">
        <Skeleton className="h-10 w-full rounded-full" />
      </CardContent>
      <CardFooter className="bg-muted/30 dark:bg-black/20 p-3 flex justify-end border-t">
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardFooter>
    </Card>
  );
};

export default SkeletonMeetingCard;