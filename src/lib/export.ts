import * as XLSX from 'xlsx';

// ========== CSV EXPORT ==========

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  options?: { columns?: { key: string; header?: string }[]; sheetName?: string }
) {
  if (!data.length) return;

  const columns = options?.columns;
  let headers: string[];
  let rows: unknown[][];

  if (columns) {
    headers = columns.map(c => c.header ?? c.key);
    rows = data.map(row => columns.map(c => formatCellValue(row[c.key])));
  } else {
    headers = Object.keys(data[0]);
    rows = data.map(row => headers.map(h => formatCellValue(row[h])));
  }

  // BOM for Excel UTF-8 support
  const bom = '\uFEFF';
  const csvContent = [
    headers.map(h => escapeCsv(h)).join(','),
    ...rows.map(row => row.map(cell => escapeCsv(String(cell))).join(','))
  ].join('\n');

  downloadBlob(new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

// ========== EXCEL EXPORT ==========

export function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  options?: {
    columns?: { key: string; header?: string; width?: number }[];
    sheetName?: string;
    author?: string;
  }
) {
  if (!data.length) return;

  const columns = options?.columns;
  const sheetName = options?.sheetName ?? 'Data';
  const headers: string[] = columns ? columns.map(c => c.header ?? c.key) : Object.keys(data[0]);
  const keys: string[] = columns ? columns.map(c => c.key) : Object.keys(data[0]);

  // Build worksheet data with headers
  const wsData = [headers, ...data.map(row => keys.map(k => formatCellValue(row[k])))];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  if (columns) {
    ws['!cols'] = columns.map(c => ({ wch: c.width ?? 15 }));
  } else {
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  if (options?.author) {
    wb.Props = { ...wb.Props, Author: options.author };
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ========== MULTI-SHEET EXCEL EXPORT ==========

export function exportToExcelMultiSheet(
  sheets: { name: string; data: Record<string, unknown>[]; columns?: { key: string; header?: string; width?: number }[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    if (!sheet.data.length) continue;

    const columns = sheet.columns;
    const headers: string[] = columns ? columns.map(c => c.header ?? c.key) : Object.keys(sheet.data[0]);
    const keys: string[] = columns ? columns.map(c => c.key) : Object.keys(sheet.data[0]);

    const wsData = [headers, ...sheet.data.map(row => keys.map(k => formatCellValue(row[k])))];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    if (columns) {
      ws['!cols'] = columns.map(c => ({ wch: c.width ?? 15 }));
    } else {
      ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
    }

    // Sheet name max 31 chars, no special chars
    const safeName = sheet.name.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ========== HELPERS ==========

function formatCellValue(val: unknown): string | number {
  if (val == null) return '';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object' && val instanceof Date) return val.toISOString().slice(0, 19).replace('T', ' ');
  if (typeof val === 'number') return val;
  return String(val);
}

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ========== EXPORT TYPE ==========

export type ExportColumn = { key: string; header?: string; width?: number };

export function getExportFilename(prefix: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  return `${prefix}_${date}_${time}`;
}