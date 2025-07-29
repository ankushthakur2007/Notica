import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const SkeletonCard = () => {
  return (
    <Card className="bg-card/50 dark:bg-gray-900/50 border border-white/10 backdrop-blur-sm">
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="pt-4 space-y-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
};

export default SkeletonCard;