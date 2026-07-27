import { Skeleton } from '@/components/ui/skeleton';
import { Radio } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile Header Skeleton */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar Skeleton */}
        <aside className="hidden lg:flex flex-col shrink-0 bg-slate-50 dark:bg-slate-900 border-e w-56">
          <div className="flex items-center gap-2 px-4 h-14 border-b shrink-0">
            <Radio className="h-5 w-5 text-primary shrink-0" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex-1 px-2 py-2 space-y-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
          <div className="border-t p-2 shrink-0">
            <Skeleton className="h-8 w-8 rounded-md ms-auto" />
          </div>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="hidden lg:flex items-center justify-between h-14 px-6 border-b shrink-0">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </header>

          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>

            {/* Chart Skeleton */}
            <div className="rounded-lg border p-4 mb-6">
              <Skeleton className="h-5 w-36 mb-4" />
              <Skeleton className="h-[300px] w-full rounded-md" />
            </div>

            {/* Table Skeleton */}
            <div className="rounded-lg border p-4">
              <Skeleton className="h-5 w-36 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <footer className="border-t px-4 py-3 text-center shrink-0 bg-background">
            <Skeleton className="h-3 w-64 mx-auto" />
          </footer>
        </main>
      </div>
    </div>
  );
}
