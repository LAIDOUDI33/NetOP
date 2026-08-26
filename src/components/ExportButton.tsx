'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { exportToCSV, exportToExcel, getExportFilename, type ExportColumn } from '@/lib/export';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filenamePrefix: string;
  columns?: ExportColumn[];
  sheetName?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

export function ExportButton({
  data,
  filenamePrefix,
  columns,
  sheetName,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  label,
}: ExportButtonProps) {
  const t = useT();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!data.length) return;
    setExporting(format);
    try {
      const filename = getExportFilename(filenamePrefix);
      const opts = { columns, sheetName };

      if (format === 'csv') {
        exportToCSV(data, filename, opts);
      } else {
        exportToExcel(data, filename, opts);
      }
    } finally {
      setTimeout(() => setExporting(null), 500);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || !data.length}>
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          {label ?? t('btn.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={!data.length}>
          <FileText className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('xlsx')} disabled={!data.length}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}