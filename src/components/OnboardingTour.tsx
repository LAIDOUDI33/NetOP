'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

const TOUR_KEY = 'netoptima-tour-seen';

interface TourStep {
  titleKey: string;
  descKey: string;
  targetId: string;
}

const STEPS: TourStep[] = [
  { titleKey: 'tour.welcome', descKey: 'tour.welcomeDesc', targetId: 'tour-logo' },
  { titleKey: 'tour.dashboard', descKey: 'tour.dashboardDesc', targetId: 'tour-dashboard' },
  { titleKey: 'tour.assistant', descKey: 'tour.assistantDesc', targetId: 'tour-assistant' },
  { titleKey: 'tour.alerts', descKey: 'tour.alertsDesc', targetId: 'tour-bell' },
  { titleKey: 'tour.map', descKey: 'tour.mapDesc', targetId: 'tour-coverage' },
];

function getTargetRect(targetId: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${targetId}"]`) ?? document.getElementById(targetId);
  if (!el) return null;
  return el.getBoundingClientRect();
}

export function OnboardingTour() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Compute target rect from step — no refs, no state, just derived
  const targetRect = useMemo(() => {
    if (!visible || step >= STEPS.length) return null;
    const current = STEPS[step];
    if (current.targetId === 'tour-logo') return null;
    return getTargetRect(current.targetId);
  }, [visible, step]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(TOUR_KEY, '1');
  }, []);

  const handleNext = useCallback(() => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    setStep((s) => s + 1);
  }, [step, dismiss]);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!visible || step >= STEPS.length) return null;

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  // Welcome step: centered card, no spotlight
  if (currentStep.targetId === 'tour-logo') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={dismiss}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="relative bg-popover border rounded-xl shadow-2xl p-6 max-w-sm w-full space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <h2 className="text-lg font-bold">{t(currentStep.titleKey)}</h2>
            <p className="text-sm text-muted-foreground">{t(currentStep.descKey)}</p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs">
              {t('tour.skip')}
            </Button>
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${i === step ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              ))}
            </div>
            <Button size="sm" onClick={handleNext} className="text-xs">
              {t('tour.next')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Spotlight steps: highlight target element
  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
        borderRadius: 8,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
        zIndex: 100,
      }
    : { position: 'fixed' as const, top: 0, left: 0, width: 0, height: 0, zIndex: 100, pointerEvents: 'none' as const };

  let cardTop = targetRect ? targetRect.bottom + 12 : 100;
  let cardLeft = targetRect ? targetRect.left + targetRect.width / 2 : 100;

  if (targetRect && cardTop + 180 > window.innerHeight) {
    cardTop = targetRect.top - 180 - 12;
  }
  cardLeft = Math.max(16, Math.min(window.innerWidth - 340, cardLeft - 150));

  return (
    <div className="fixed inset-0 z-[100]" onClick={dismiss}>
      <div style={spotlightStyle} onClick={(e) => e.stopPropagation()} />
      <div
        className="fixed bg-popover border rounded-xl shadow-2xl p-4 max-w-[300px] w-full space-y-3"
        style={{ top: cardTop, left: cardLeft, zIndex: 101 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">{step + 1}/{STEPS.length}</p>
          <h2 className="text-sm font-bold">{t(currentStep.titleKey)}</h2>
          <p className="text-xs text-muted-foreground">{t(currentStep.descKey)}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="text-xs h-7 px-2">
                {t('tour.back')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={dismiss} className="text-xs h-7 px-2 text-muted-foreground">
              {t('tour.skip')}
            </Button>
          </div>
          <Button size="sm" onClick={handleNext} className="text-xs h-7">
            {isLast ? t('tour.finish') : t('tour.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
