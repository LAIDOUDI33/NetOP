'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Client-side session guard that redirects unauthenticated users to /login.
 * Shows a centered loading spinner while the session is being resolved.
 */
export function SessionGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated' && !redirected.current) {
      redirected.current = true;
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
