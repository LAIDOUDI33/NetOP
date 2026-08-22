import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ========== TYPES ==========

export interface PdfReportOptions {
  title: string;
  subtitle?: string;
  author?: string;
  orientation?: 'portrait' | 'landscape';
}

export interface PdfSection {
  title: string;
  data?: Record<string, unknown>[];
  columns?: { header: string; key: string; width?: number }[];
  summary?: Record<string, string | number>;
  chartImage?: string; // base64 data URL
}

// ========== COLOR SCHEME ==========

const COLORS = {
  primary: [5, 150, 105] as [number, number, number],       // #059669 emerald
  primaryLight: [236, 253, 245] as [number, number, number], // #ECFDF5
  primaryDark: [4, 120, 83] as [number, number, number],     // #047857
  text: [17, 24, 39] as [number, number, number],            // #111827
  textMuted: [107, 114, 128] as [number, number, number],    // #6B7280
  border: [229, 231, 235] as [number, number, number],       // #E5E7EB
  white: [255, 255, 255] as [number, number, number],
  rowAlt: [249, 250, 251] as [number, number, number],       // #F9FAFB
  confidentialBg: [254, 242, 242] as [number, number, number], // #FEF2F2 red-50
  confidentialText: [185, 28, 28] as [number, number, number], // #B91C1C red-700
};

const PAGE_MARGIN = 14;
const CONTENT_WIDTH_PORTRAIT = 210 - 2 * PAGE_MARGIN;
const CONTENT_WIDTH_LANDSCAPE = 297 - 2 * PAGE_MARGIN;
const FOOTER_HEIGHT = 12;

// ========== PUBLIC API ==========

export function generatePdfReport(sections: PdfSection[], options: PdfReportOptions): void {
  const orientation = options.orientation ?? 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  // Set document properties
  doc.setProperties({
    title: options.title,
    author: options.author ?? 'NetOptima Algérie',
    creator: 'NetOptima Algérie NOC Platform',
    subject: options.subtitle ?? options.title,
  });

  const contentWidth = orientation === 'landscape' ? CONTENT_WIDTH_LANDSCAPE : CONTENT_WIDTH_PORTRAIT;

  // Header
  let y = createReportHeader(doc, options.title, options.subtitle);

  // Confidential tag
  y = addConfidentialTag(doc, y, contentWidth);

  // Generation timestamp
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  const timestamp = new Date().toLocaleString('fr-DZ', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  doc.text(`Généré le: ${timestamp}`, PAGE_MARGIN, y);
  y += 8;

  // Sections
  for (const section of sections) {
    y = renderSection(doc, section, y, contentWidth);
  }

  // Page numbers (footer on all pages)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    createReportFooter(doc, i, totalPages);
  }

  // Save
  const filename = options.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  doc.save(`${filename}_${formatDateForFilename()}.pdf`);
}

export function addChartImage(
  doc: jsPDF,
  imgDataUrl: string,
  x: number,
  y: number,
  maxWidth: number
): number {
  if (!imgDataUrl) return 0;

  try {
    // Use jsPDF internal image loading to get dimensions
    const img = new Image();
    img.src = imgDataUrl;
    // Since img loading is sync in jsPDF context, we compute aspect ratio from the data
    // jsPDF addImage will scale automatically
    const imgWidth = maxWidth;
    // Estimate height: default 4:3 ratio for charts if natural dimensions aren't available
    const imgHeight = imgWidth * 0.6; // 5:3 aspect ratio

    doc.addImage(imgDataUrl, 'PNG', x, y, imgWidth, imgHeight);
    return imgHeight;
  } catch {
    // If image fails, draw placeholder
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.rowAlt);
    doc.roundedRect(x, y, maxWidth, 30, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('[Chart image could not be rendered]', x + maxWidth / 2, y + 16, {
      align: 'center',
    });
    return 30;
  }
}

export function createReportHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = PAGE_MARGIN;

  // Logo placeholder (small colored square)
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(PAGE_MARGIN, y, 6, 6, 1, 1, 'F');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.white);
  doc.text('N', PAGE_MARGIN + 1.8, y + 4.3);

  // Platform name to the right of logo
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.text('NetOptima Algérie', PAGE_MARGIN + 9, y + 4.3);

  // Right side: NOC Platform
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('NOC Platform', pageWidth - PAGE_MARGIN, y + 2.5, { align: 'right' });
  doc.text('Network Optimization Suite', pageWidth - PAGE_MARGIN, y + 6, { align: 'right' });

  y += 12;

  // Title underline bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(PAGE_MARGIN, y, pageWidth - 2 * PAGE_MARGIN, 0.5, 'F');
  y += 6;

  // Report title
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 6;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(subtitle, PAGE_MARGIN, y);
    y += 6;
  }

  // Bottom border
  doc.setFillColor(...COLORS.border);
  doc.rect(PAGE_MARGIN, y, pageWidth - 2 * PAGE_MARGIN, 0.3, 'F');
  y += 6;

  return y;
}

export function createReportFooter(doc: jsPDF, pageNumber: number, totalPages: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 8;

  // Top line
  doc.setFillColor(...COLORS.border);
  doc.rect(PAGE_MARGIN, y - 2, pageWidth - 2 * PAGE_MARGIN, 0.3, 'F');

  // Footer text
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('NetOptima Algérie — NOC Platform', PAGE_MARGIN, y + 3);

  // Page number centered
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.text(
    `Page ${pageNumber} / ${totalPages}`,
    pageWidth / 2,
    y + 3,
    { align: 'center' }
  );

  // Date on right
  doc.text(dateStr, pageWidth - PAGE_MARGIN, y + 3, { align: 'right' });
}

// ========== INTERNAL HELPERS ==========

function addConfidentialTag(doc: jsPDF, y: number, contentWidth: number): number {
  const tagWidth = 28;
  const tagHeight = 5;
  const x = PAGE_MARGIN + contentWidth - tagWidth;

  doc.setFillColor(...COLORS.confidentialBg);
  doc.roundedRect(x, y - 4, tagWidth, tagHeight, 1, 1, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.confidentialText);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIEL', x + tagWidth / 2, y - 1.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');

  return y + 2;
}

function renderSection(
  doc: jsPDF,
  section: PdfSection,
  startY: number,
  contentWidth: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableBottomMargin = FOOTER_HEIGHT + 6;
  let y = startY;

  // Check if we need a new page for the section title
  if (y > pageHeight - 30) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  // Section title (h2 style)
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(section.title, PAGE_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  y += 2;

  // Underline
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + Math.min(doc.getTextWidth(section.title), contentWidth * 0.4), y);
  doc.setLineWidth(0.2);
  y += 5;

  // Summary KPIs box
  if (section.summary && Object.keys(section.summary).length > 0) {
    y = renderSummaryBox(doc, section.summary, y, contentWidth);
  }

  // Data table
  if (section.data && section.data.length > 0 && section.columns && section.columns.length > 0) {
    // Check if we have enough space for at least 3 rows of table
    const estimatedTableHeight = Math.min(section.data.length, 5) * 7 + 20;
    if (y + estimatedTableHeight > pageHeight - tableBottomMargin) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    y = renderDataTable(doc, section.data, section.columns, y, contentWidth);
  }

  // Chart image
  if (section.chartImage) {
    const chartHeight = contentWidth * 0.6; // aspect ratio 5:3
    if (y + chartHeight + 5 > pageHeight - tableBottomMargin) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    const usedHeight = addChartImage(doc, section.chartImage, PAGE_MARGIN, y, contentWidth);
    y += usedHeight + 5;
  }

  // Spacing after section
  y += 4;

  return y;
}

function renderSummaryBox(
  doc: jsPDF,
  summary: Record<string, string | number>,
  y: number,
  contentWidth: number
): number {
  const entries = Object.entries(summary);
  const cols = entries.length <= 3 ? entries.length : entries.length <= 6 ? 3 : 4;
  const rows = Math.ceil(entries.length / cols);
  const boxHeight = rows * 10 + 6;

  // Check page break
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + boxHeight > pageHeight - FOOTER_HEIGHT - 6) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  // Box background
  doc.setFillColor(...COLORS.primaryLight);
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, boxHeight, 2, 2, 'F');

  // Left accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(PAGE_MARGIN, y, 1.2, boxHeight, 'F');

  const colWidth = (contentWidth - 4) / cols;
  let idx = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (idx >= entries.length) break;

      const [key, value] = entries[idx];
      const cellX = PAGE_MARGIN + 4 + col * colWidth;
      const cellY = y + 6 + row * 10;

      // Key label
      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(formatLabel(key), cellX, cellY);

      // Value
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.text(formatNumber(value), cellX, cellY + 5);
      doc.setFont('helvetica', 'normal');

      idx++;
    }
  }

  return y + boxHeight + 4;
}

function renderDataTable(
  doc: jsPDF,
  data: Record<string, unknown>[],
  columns: { header: string; key: string; width?: number }[],
  startY: number,
  contentWidth: number
): number {
  const head = [columns.map(c => c.header)];
  const body = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val == null) return '—';
      if (typeof val === 'number') return formatNumber(val);
      if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
      return String(val);
    })
  );

  const colWidths = columns.map(c => {
    if (c.width) return c.width;
    const totalSpecified = columns.filter(col => col.width).reduce((s, col) => s + (col.width ?? 0), 0);
    const unspecifiedCount = columns.filter(col => !col.width).length;
    if (unspecifiedCount === 0) return contentWidth / columns.length;
    return (contentWidth - totalSpecified) / unspecifiedCount;
  });

  const tableResult = autoTable(doc, {
    head,
    body,
    startY,
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: FOOTER_HEIGHT + 4 },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { cellWidth: colWidths[i] }])
    ),
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: COLORS.text,
    },
    alternateRowStyles: {
      fillColor: COLORS.rowAlt,
    },
    styles: {
      lineColor: COLORS.border,
      lineWidth: 0.1,
      overflow: 'linebreak',
      valign: 'top',
    },
    didDrawPage: () => {
      // Add footer on each page that the table spans
      const pageNum = doc.getNumberOfPages();
      createReportFooter(doc, pageNum, 0); // totalPages will be updated later
    },
  });

  // Return Y position after the table
  return tableResult.finalY ?? startY + 20;
}

// ========== FORMATTING UTILITIES ==========

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function formatNumber(val: string | number): string {
  if (typeof val === 'string') return val;
  if (Number.isInteger(val)) return val.toLocaleString('fr-FR');
  return val.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function formatDateForFilename(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}
