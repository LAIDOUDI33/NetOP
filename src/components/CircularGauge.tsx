'use client';

import { useEffect, useState } from 'react';

interface CircularGaugeProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  unit?: string;
  colorFn?: (_value: number, _max: number) => string;
  showValue?: boolean;
}

export function CircularGauge({
  value,
  max = 100,
  size = 100,
  strokeWidth = 8,
  label,
  unit = '',
  colorFn,
  showValue = true,
}: CircularGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const defaultColor = pct >= 0.95
    ? 'text-emerald-500'
    : pct >= 0.85
      ? 'text-amber-500'
      : 'text-red-500';

  const color = colorFn ? colorFn(value, max) : defaultColor;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  const animPct = Math.min(animatedValue / max, 1);
  const animOffset = circumference - animPct * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animOffset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.3s' }}
        />
      </svg>
      {showValue && (
        <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
          <span className="text-lg font-bold tabular-nums">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
        </div>
      )}
      <span className="text-[11px] text-muted-foreground font-medium mt-[-4px]">{label}</span>
    </div>
  );
}
