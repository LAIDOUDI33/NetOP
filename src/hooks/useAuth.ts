'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app';
import { MODULE_VIEW_MAP } from '@/lib/rbac-constants';

/**
 * Fetches the current user session from /api/auth/me and populates
 * the Zustand store with user data + computed allowed views.
 * Call once at app root level.
 */
export function useAuth() {
  const { setUser, setAllowedViews } = useAppStore();
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    fetch('/api/auth/me')
      .then((r) => {
        if (!r.ok) throw new Error('Not authenticated');
        return r.json();
      })
      .then((user) => {
        setUser(user);

        // Compute allowed views from permissions
        const perms: string[] = user.permissions ?? [];
        const allowed = new Set<string>();

        if (perms.includes('*:*')) {
          // Superadmin — all views
          Object.values(MODULE_VIEW_MAP).flat().forEach((v) => allowed.add(v));
        } else {
          for (const [mod, views] of Object.entries(MODULE_VIEW_MAP)) {
            if (perms.includes(`${mod}:*`) || perms.includes(`${mod}:view`)) {
              views.forEach((v) => allowed.add(v));
            }
          }
        }

        // Always allow settings (it's a system view)
        allowed.add('settings');

        setAllowedViews(allowed);
      })
      .catch(() => {
        // Not authenticated — redirect will be handled by middleware
        setUser(null);
        setAllowedViews(new Set());
      });
  }, [setUser, setAllowedViews]);
}
