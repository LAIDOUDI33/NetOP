'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Construction } from 'lucide-react';

export default function EnergyView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Construction className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Coming Soon</p>
          <p className="text-xs mt-1">This module is under construction</p>
        </CardContent>
      </Card>
    </div>
  );
}
