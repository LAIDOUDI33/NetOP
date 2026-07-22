'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
        setError(t('auth.invalidCredentials'));
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      <Card className="w-full max-w-md relative z-10 border-slate-700 bg-slate-800/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Shield className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">NetOptima Algérie</CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {t('auth.subtitle')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@netoptima-dz.local"
                required
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth.signingIn')}
                </>
              ) : (
                t('auth.signIn')
              )}
            </Button>
          </form>

          {/* Demo accounts info */}
          <div className="mt-6 p-3 rounded-lg bg-slate-700/30 border border-slate-600/50">
            <p className="text-xs text-slate-400 font-medium mb-2">{t('auth.demoAccounts')}</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-500">
              <div><span className="text-emerald-400 font-medium">admin</span>@netoptima-dz.local</div>
              <div className="text-slate-600">admin123</div>
              <div><span className="text-cyan-400 font-medium">noc</span>@netoptima-dz.local</div>
              <div className="text-slate-600">demo123</div>
              <div><span className="text-amber-400 font-medium">rf</span>@netoptima-dz.local</div>
              <div className="text-slate-600">demo123</div>
              <div><span className="text-violet-400 font-medium">viewer</span>@netoptima-dz.local</div>
              <div className="text-slate-600">demo123</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}