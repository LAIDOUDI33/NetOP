'use client';

import { useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Radio, Activity, BarChart3, FileText, Loader2, Eye, EyeOff, Network, Languages } from 'lucide-react';

const features = [
  { key: 'login.features.monitoring', icon: Activity },
  { key: 'login.features.analytics', icon: BarChart3 },
  { key: 'login.features.automation', icon: Radio },
  { key: 'login.features.reporting', icon: FileText },
] as const;

const localeLabels: Record<Locale, string> = { en: 'English', fr: 'Français', ar: 'العربية' };

export default function LoginPage() {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRtl = locale === 'ar';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(t('login.error'));
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        setError(t('login.error'));
      } finally {
        setLoading(false);
      }
    },
    [email, password, callbackUrl, router, t]
  );

  return (
    <div className="min-h-screen flex" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Network className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">{t('login.title')}</span>
          </div>
          <p className="text-emerald-200 text-sm ml-13">{t('login.subtitle')}</p>
        </div>

        <div className="space-y-6">
          {features.map(({ key, icon: Icon }) => (
            <div key={key} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-emerald-300" />
              </div>
              <span className="text-emerald-100 text-lg">{t(key)}</span>
            </div>
          ))}
        </div>

        <div className="text-emerald-300/60 text-xs">
          NetOptima Algérie — AI-Powered Network Optimization
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-900 flex items-center justify-center">
                <Network className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('login.title')}</span>
            </div>
            <p className="text-muted-foreground text-sm">{t('login.subtitle')}</p>
          </div>

          {/* Language Selector */}
          <div className={isRtl ? 'flex justify-start' : 'flex justify-end'}>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger className="w-[140px] h-9">
                <Languages className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(localeLabels) as [Locale, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
              <CardDescription>{t('login.subtitle')}</CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle>{t('login.errorTitle')}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('login.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@netoptima-dz.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={loading}
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('login.signingIn')}
                    </>
                  ) : (
                    t('login.signIn')
                  )}
                </Button>
              </form>

              {/* Demo Hint */}
              <div className="mt-6 p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground text-center">
                  {t('login.demoHint')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
