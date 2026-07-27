'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Radio, ArrowLeft } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Radio className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-muted-foreground">{t('notFound.title')}</h1>
            <h2 className="text-lg font-semibold">{t('notFound.heading')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('notFound.description')}
            </p>
          </div>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('notFound.backButton')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
