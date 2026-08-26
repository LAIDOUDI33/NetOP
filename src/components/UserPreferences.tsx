'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Bell, Palette, Save, Loader2, Globe, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { useAppStore } from '@/store/app';
import { useTheme } from 'next-themes';
import type { Locale } from '@/lib/i18n';

const VIEW_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'kpi', label: 'KPI Analytics' },
  { value: 'live', label: 'Live View' },
  { value: 'assistant', label: 'AI Assistant' },
];

const TIMEZONES = [
  'Africa/Algiers', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Tunis',
  'Europe/Paris', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid',
  'Asia/Riyadh', 'Asia/Dubai', 'America/New_York', 'America/Chicago',
];

const SEVERITY_CONFIGS = [
  { key: 'notifyCritical', labelKey: 'prefs.critical', color: 'bg-red-500' },
  { key: 'notifyMajor', labelKey: 'prefs.major', color: 'bg-orange-500' },
  { key: 'notifyMinor', labelKey: 'prefs.minor', color: 'bg-amber-500' },
  { key: 'notifyWarning', labelKey: 'prefs.warning', color: 'bg-yellow-500' },
  { key: 'notifyInfo', labelKey: 'prefs.info', color: 'bg-blue-500' },
] as const;

export default function UserPreferences() {
  const t = useT();
  const { user } = useAppStore();
  const { setTheme } = useTheme();
  const { setLocale } = useAppStore();
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => fetch('/api/user/profile').then(r => r.ok ? r.json() : null),
  });

  // Fetch preferences
  const { data: prefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: () => fetch('/api/user/preferences').then(r => r.ok ? r.json() : null),
  });

  // Computed defaults from server data
  const profileDefaults = useMemo(() => ({
    name: profile?.name || '',
    phone: profile?.phone || '',
  }), [profile?.name, profile?.phone]);

  const notifDefaults = useMemo(() => ({
    bio: prefs?.bio || '',
    timezone: prefs?.timezone || 'Africa/Algiers',
    notifyCritical: prefs?.notifyCritical ?? true, notifyMajor: prefs?.notifyMajor ?? true,
    notifyMinor: prefs?.notifyMinor ?? false, notifyWarning: prefs?.notifyWarning ?? true, notifyInfo: prefs?.notifyInfo ?? false,
    notifySound: prefs?.notifySound ?? true, notifyBrowser: prefs?.notifyBrowser ?? true,
    quietHoursEnabled: prefs?.quietHoursEnabled ?? false,
    quietHoursStart: prefs?.quietHoursStart || '22:00', quietHoursEnd: prefs?.quietHoursEnd || '07:00',
    digestFrequency: prefs?.digestFrequency || 'none',
  }), [prefs]);

  const displayDefaults = useMemo(() => ({
    locale: prefs?.locale || 'fr', theme: prefs?.theme || 'system', density: prefs?.density || 'default',
    defaultView: prefs?.defaultView || 'dashboard', dateFormat: prefs?.dateFormat || 'DD/MM/YYYY', timeFormat: prefs?.timeFormat || '24h',
  }), [prefs]);

  // Profile form state
  const [name, setName] = useState(profileDefaults.name);
  const [phone, setPhone] = useState(profileDefaults.phone);
  const [bio, setBio] = useState(notifDefaults.bio);
  const [timezone, setTimezone] = useState(notifDefaults.timezone);

  // Preferences form state
  const [notifState, setNotifState] = useState({
    notifyCritical: notifDefaults.notifyCritical, notifyMajor: notifDefaults.notifyMajor, notifyMinor: notifDefaults.notifyMinor, notifyWarning: notifDefaults.notifyWarning, notifyInfo: notifDefaults.notifyInfo,
    notifySound: notifDefaults.notifySound, notifyBrowser: notifDefaults.notifyBrowser,
    quietHoursEnabled: notifDefaults.quietHoursEnabled, quietHoursStart: notifDefaults.quietHoursStart, quietHoursEnd: notifDefaults.quietHoursEnd,
    digestFrequency: notifDefaults.digestFrequency,
  });
  const [displayState, setDisplayState] = useState({
    locale: displayDefaults.locale, theme: displayDefaults.theme, density: displayDefaults.density,
    defaultView: displayDefaults.defaultView, dateFormat: displayDefaults.dateFormat, timeFormat: displayDefaults.timeFormat,
  });

  // Mutations
  const saveProfile = useMutation({
    mutationFn: () => fetch('/api/user/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) }).then(r => r.json()),
    onSuccess: () => { toast.success(t('prefs.profileSaved')); queryClient.invalidateQueries({ queryKey: ['user-profile'] }); },
  });

  const savePrefs = useMutation({
    mutationFn: (data: Record<string, unknown>) => fetch('/api/user/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['user-preferences'] }); },
  });

  const handleSaveNotif = () => {
    savePrefs.mutate({ ...notifState, timezone, bio });
    toast.success(t('prefs.notifSaved'));
  };

  const handleSaveDisplay = () => {
    savePrefs.mutate(displayState);
    setTheme(displayState.theme as any);
    setLocale(displayState.locale as Locale);
    toast.success(t('prefs.displaySaved'));
  };

  const isLoading = profileLoading || prefsLoading;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card (always visible) */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> {t('prefs.profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3"><Skeleton className="h-16 w-16 rounded-full mx-auto" /><Skeleton className="h-4 w-32 mx-auto" /><Skeleton className="h-3 w-24 mx-auto" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-3/4" /></div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="h-16 w-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold mx-auto">
                    {profile?.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{profile?.name || user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email || user?.email || ''}</p>
                  </div>
                  {profile?.roles && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {profile.roles.map((r: { name: string; displayName: string }) => (
                        <Badge key={r.name} variant="secondary" className="text-[10px]">{r.displayName}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('prefs.department')}</span><span>{profile?.department || 'NOC'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('prefs.joined')}</span><span>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('prefs.lastLogin')}</span><span>{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : '—'}</span></div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('prefs.fullName')}</Label>
                    <Input className="h-9 text-sm" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('prefs.phone')}</Label>
                    <Input className="h-9 text-sm" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+213 XX XXX XXXX" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('prefs.timezone')}</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-48">{TIMEZONES.map(tz => <SelectItem key={tz} value={tz} className="text-xs">{tz}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('prefs.bio')}</Label>
                    <Input className="h-9 text-sm" value={bio} onChange={e => setBio(e.target.value)} placeholder={t('prefs.bioPlaceholder')} />
                  </div>
                  <Button size="sm" className="w-full h-9 text-xs" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    {t('prefs.saveProfile')}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right column: Notifications + Display */}
        <div className="lg:col-span-2 space-y-4">
          {/* Notifications Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> {t('prefs.notifications')}</CardTitle>
              <CardDescription className="text-xs">{t('prefs.notifDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
                <>
                  <div>
                    <p className="text-xs font-medium mb-3">{t('prefs.severitySubscriptions')}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SEVERITY_CONFIGS.map(({ key, labelKey, color }) => {
                        return (
                          <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
                              <span className="text-xs font-medium">{t(labelKey)}</span>
                            </div>
                            <Switch checked={notifState[key as keyof typeof notifState] as boolean} onCheckedChange={v => setNotifState(s => ({ ...s, [key]: v }))} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />
                  <div>
                    <p className="text-xs font-medium mb-3">{t('prefs.deliveryChannels')}</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2.5"><Globe className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-medium">{t('prefs.browserNotif')}</span></div>
                        <Switch checked={notifState.notifyBrowser} onCheckedChange={v => setNotifState(s => ({ ...s, notifyBrowser: v }))} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-xs font-medium">{t('prefs.soundAlerts')}</span></div>
                        <Switch checked={notifState.notifySound} onCheckedChange={v => setNotifState(s => ({ ...s, notifySound: v }))} />
                      </div>
                    </div>
                  </div>

                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium">{t('prefs.quietHours')}</p>
                      <Switch checked={notifState.quietHoursEnabled} onCheckedChange={v => setNotifState(s => ({ ...s, quietHoursEnabled: v }))} />
                    </div>
                    {notifState.quietHoursEnabled && (
                      <div className="grid grid-cols-2 gap-3 ml-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('prefs.quietStart')}</Label>
                          <Input type="time" className="h-9 text-sm" value={notifState.quietHoursStart} onChange={e => setNotifState(s => ({ ...s, quietHoursStart: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('prefs.quietEnd')}</Label>
                          <Input type="time" className="h-9 text-sm" value={notifState.quietHoursEnd} onChange={e => setNotifState(s => ({ ...s, quietHoursEnd: e.target.value }))} />
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">{t('prefs.quietHoursDesc')}</p>
                  </div>

                  <Separator />
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('prefs.digestFreq')}</Label>
                    <Select value={notifState.digestFrequency} onValueChange={v => setNotifState(s => ({ ...s, digestFrequency: v }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">{t('prefs.none')}</SelectItem>
                        <SelectItem value="hourly" className="text-xs">{t('prefs.hourly')}</SelectItem>
                        <SelectItem value="daily" className="text-xs">{t('prefs.daily')}</SelectItem>
                        <SelectItem value="weekly" className="text-xs">{t('prefs.weekly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button size="sm" className="h-9 text-xs" onClick={handleSaveNotif} disabled={savePrefs.isPending}>
                    {savePrefs.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    {t('prefs.saveNotif')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Display Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Palette className="h-4 w-4" /> {t('prefs.display')}</CardTitle>
              <CardDescription className="text-xs">{t('prefs.displayDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('prefs.language')}</Label>
                      <Select value={displayState.locale} onValueChange={v => setDisplayState(s => ({ ...s, locale: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en" className="text-xs">English</SelectItem>
                          <SelectItem value="fr" className="text-xs">Français</SelectItem>
                          <SelectItem value="ar" className="text-xs">العربية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('prefs.theme')}</Label>
                      <Select value={displayState.theme} onValueChange={v => setDisplayState(s => ({ ...s, theme: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system" className="text-xs">{t('prefs.themeSystem')}</SelectItem>
                          <SelectItem value="light" className="text-xs">{t('prefs.themeLight')}</SelectItem>
                          <SelectItem value="dark" className="text-xs">{t('prefs.themeDark')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('prefs.density')}</Label>
                      <Select value={displayState.density} onValueChange={v => setDisplayState(s => ({ ...s, density: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact" className="text-xs">{t('prefs.densityCompact')}</SelectItem>
                          <SelectItem value="default" className="text-xs">{t('prefs.densityDefault')}</SelectItem>
                          <SelectItem value="comfortable" className="text-xs">{t('prefs.densityComfortable')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('prefs.defaultView')}</Label>
                      <Select value={displayState.defaultView} onValueChange={v => setDisplayState(s => ({ ...s, defaultView: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VIEW_OPTIONS.map(v => <SelectItem key={v.value} value={v.value} className="text-xs">{v.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('prefs.dateFormat')}</Label>
                      <Select value={displayState.dateFormat} onValueChange={v => setDisplayState(s => ({ ...s, dateFormat: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DD/MM/YYYY" className="text-xs">DD/MM/YYYY</SelectItem>
                          <SelectItem value="MM/DD/YYYY" className="text-xs">MM/DD/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD" className="text-xs">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('prefs.timeFormat')}</Label>
                      <Select value={displayState.timeFormat} onValueChange={v => setDisplayState(s => ({ ...s, timeFormat: v }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24h" className="text-xs">24h</SelectItem>
                          <SelectItem value="12h" className="text-xs">12h (AM/PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="h-9 text-xs" onClick={handleSaveDisplay} disabled={savePrefs.isPending}>
                    {savePrefs.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    {t('prefs.saveDisplay')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
