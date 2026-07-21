'use client';

import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface DataExportButtonProps {
  /** The data rows to export */
  data: Record<string, unknown>[];
  /** Filename without extension (e.g. "alerts-4G") */
  filename: string;
  /** Optional: explicit column headers. If not provided, uses object keys */
  columns?: { key: string; label: string }[];
  /** Button size variant */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function DataExportButton({
  data,
  filename,
  columns,
  size = 'sm',
}: DataExportButtonProps) {
  const t = useT();

  const handleExport = () => {
    if (!data || data.length === 0) return;

    const cols = columns ?? Object.keys(data[0]).map((key) => ({ key, label: key }));

    // Header row
    const header = cols.map((c) => escapeCsv(c.label)).join(',');

    // Data rows
    const rows = data.map((row) =>
      cols
        .map((c) => {
          const val = row[c.key];
          if (typeof val === 'object' && val !== null) {
            return escapeCsv(JSON.stringify(val));
          }
          return escapeCsv(val);
        })
        .join(',')
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="gap-1.5"
    >
      <Download className="h-3.5 w-3.5" />
      {t('btn.exportCsv')}
    </Button>
  );
}