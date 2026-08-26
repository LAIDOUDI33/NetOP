'use client';

import { useMemo } from 'react';

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  showDots?: boolean;
}

export function SparkLine({
  data,
  width = 120,
  height = 32,
  color = 'currentColor',
  fillOpacity = 0.1,
  showDots = false,
}: SparkLineProps) {
  const { path, areaPath, min, max } = useMemo(() => {
    if (data.length < 2) return { path: '', areaPath: '', min: 0, max: 0 };

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 2;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const points = data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * chartW,
      y: padding + chartH - ((val - minVal) / range) * chartH,
    }));

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }

    const areaD = d + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return { path: d, areaPath: areaD, min: minVal, max: maxVal };
  }, [data, width, height]);

  if (data.length < 2) {
    return <div style={{ width, height }} className="flex items-center justify-center text-[10px] text-muted-foreground">—</div>;
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={areaPath} fill={color} fillOpacity={fillOpacity} />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showDots && data.length <= 20 && (
        <>
          <circle cx={2} cy={height - 2 - ((data[0] - min) / (max - min || 1)) * (height - 4)} r={2} fill={color} />
          <circle cx={width - 2} cy={height - 2 - ((data[data.length - 1] - min) / (max - min || 1)) * (height - 4)} r={2.5} fill={color} stroke="white" strokeWidth={1} />
        </>
      )}
    </svg>
  );
}
