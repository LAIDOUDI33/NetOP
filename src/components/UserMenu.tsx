'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/app';
import { useT } from '@/lib/i18n';
import { signOut } from 'next-auth/react';
import {
  LogOut,
  Settings,
  Shield,
  ChevronDown,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

/** Format a role slug into a human-readable label */
function formatRole(role: string): string {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extract initials from a full name */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

export default function UserMenu() {
  const user = useAppStore((s) => s.user);
  const locale = useAppStore((s) => s.locale);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const t = useT();
  const [open, setOpen] = useState(false);

  const isRtl = locale === 'ar';

  const initials = user?.name ? getInitials(user.name) : '?';

  const formattedRoles = user?.roles?.length ? user.roles.map(formatRole) : [];

  const visibleRoles = formattedRoles.slice(0, 2);
  const extraCount = formattedRoles.length - 2;

  const handleSettings = useCallback(() => {
    setCurrentView('settings');
    setOpen(false);
  }, [setCurrentView]);

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: '/login' });
  }, []);

  if (!user) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* Trigger — mobile: avatar only, desktop: avatar + name + chevron */}
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isRtl ? 'flex-row-reverse' : ''
          }`}
          aria-label={user.name}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name + chevron — desktop only */}
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="max-w-[140px] truncate text-foreground">
              {user.name}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </span>
        </button>
      </DropdownMenuTrigger>

      {/* Dropdown content */}
      <DropdownMenuContent
        align={isRtl ? 'start' : 'end'}
        sideOffset={8}
        className="w-72"
      >
        {/* Header: user info */}
        <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Role badges */}
        {formattedRoles.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div
              className={`flex flex-wrap items-center gap-1.5 px-3 py-2 ${
                isRtl ? 'flex-row-reverse' : ''
              }`}
            >
              <Shield className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('user.menu.roles')}:
              </span>
              {visibleRoles.map((role) => (
                <Badge
                  key={role}
                  variant="secondary"
                  className="text-[11px] leading-tight"
                >
                  {role}
                </Badge>
              ))}
              {extraCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[11px] leading-tight"
                >
                  {t('user.menu.moreRoles', { n: extraCount })}
                </Badge>
              )}
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Settings */}
        <DropdownMenuItem
          onClick={handleSettings}
          className={`cursor-pointer ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <Settings className="size-4" />
          <span>{t('user.menu.settings')}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogout}
          variant="destructive"
          className={`cursor-pointer ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <LogOut className="size-4" />
          <span>{t('user.menu.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
