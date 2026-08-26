'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode } from 'react';
export { MODULE_VIEW_MAP } from './rbac-constants';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// Hook to check permissions on client side
export function usePermissions() {
  const { data: session } = useSession();
  const user = session?.user;
  const permissions = (user as { permissions?: string[] } | undefined)?.permissions ?? [];
  const roles = (user as { roles?: string[] } | undefined)?.roles ?? [];

  return {
    user,
    permissions,
    hasPermission: (module: string, action: string) => {
      if (permissions.includes('*:*')) return true;
      if (permissions.includes(`${module}:*`)) return true;
      return permissions.includes(`${module}:${action}`);
    },
    hasAnyPermission: (perms: string[]) => {
      if (permissions.includes('*:*')) return true;
      return perms.some((p) => {
        const [mod] = p.split(':');
        if (permissions.includes(`${mod}:*`)) return true;
        return permissions.includes(p);
      });
    },
    roles,
    isSuperAdmin: roles.includes('superadmin'),
  };
}