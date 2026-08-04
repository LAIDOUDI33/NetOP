import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so variables are available inside vi.mock (which is hoisted)
const { mockJsPDF, mockSave, mockSetProperties } = vi.hoisted(() => {
  const mockSetProperties = vi.fn();
  const mockSetFontSize = vi.fn();
  const mockSetTextColor = vi.fn();
  const mockSetFillColor = vi.fn();
  const mockSetDrawColor = vi.fn();
  const mockSetFont = vi.fn();
  const mockSetLineWidth = vi.fn();
  const mockText = vi.fn();
  const mockRect = vi.fn();
  const mockRoundedRect = vi.fn();
  const mockLine = vi.fn();
  const mockAddImage = vi.fn();
  const mockAddPage = vi.fn();
  const mockSetPage = vi.fn();
  const mockGetNumberOfPages = vi.fn(() => 1);
  const mockGetTextWidth = vi.fn(() => 50);
  const mockSave = vi.fn();

  const mockInternal = {
    pageSize: {
      getWidth: vi.fn(() => 210),
      getHeight: vi.fn(() => 297),
    },
  };

  // Use a regular function (not arrow) so it works with `new` keyword
  const mockJsPDF = vi.fn().mockImplementation(function () {
    this.setProperties = mockSetProperties;
    this.setFontSize = mockSetFontSize;
    this.setTextColor = mockSetTextColor;
    this.setFillColor = mockSetFillColor;
    this.setDrawColor = mockSetDrawColor;
    this.setFont = mockSetFont;
    this.setLineWidth = mockSetLineWidth;
    this.text = mockText;
    this.rect = mockRect;
    this.roundedRect = mockRoundedRect;
    this.line = mockLine;
    this.addImage = mockAddImage;
    this.addPage = mockAddPage;
    this.setPage = mockSetPage;
    this.getNumberOfPages = mockGetNumberOfPages;
    this.internal = mockInternal;
    this.getTextWidth = mockGetTextWidth;
    this.save = mockSave;
  });

  return { mockJsPDF, mockSave, mockSetProperties };
});

vi.mock('jspdf', () => ({
  default: mockJsPDF,
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(() => ({ finalY: 100 })),
}));

import { generatePdfReport, addChartImage, createReportHeader, createReportFooter } from '@/lib/pdf-generator';

describe('pdf-generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exports', () => {
    it('exports generatePdfReport as a function', () => {
      expect(typeof generatePdfReport).toBe('function');
    });

    it('exports addChartImage as a function', () => {
      expect(typeof addChartImage).toBe('function');
    });

    it('exports createReportHeader as a function', () => {
      expect(typeof createReportHeader).toBe('function');
    });

    it('exports createReportFooter as a function', () => {
      expect(typeof createReportFooter).toBe('function');
    });
  });

  describe('generatePdfReport', () => {
    it('is callable and creates a jsPDF instance', () => {
      generatePdfReport([], { title: 'Test Report' });
      expect(mockJsPDF).toHaveBeenCalled();
    });

    it('calls doc.save with a sanitized filename', () => {
      generatePdfReport([], { title: 'Test Report' });
      expect(mockSave).toHaveBeenCalled();
      const filename = mockSave.mock.calls[0][0];
      expect(filename).toMatch(/^test_report_\d{8}\.pdf$/);
    });

    it('calls doc.setProperties with title and author', () => {
      generatePdfReport([], { title: 'My Report', author: 'Test Author' });
      expect(mockSetProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Report',
          author: 'Test Author',
        })
      );
    });
  });

  describe('createReportHeader', () => {
    it('returns a Y coordinate number', () => {
      const doc = new (mockJsPDF as any)();
      const y = createReportHeader(doc, 'Test Title', 'Subtitle');
      expect(typeof y).toBe('number');
      expect(y).toBeGreaterThan(0);
    });
  });

  describe('createReportFooter', () => {
    it('is callable without throwing', () => {
      const doc = new (mockJsPDF as any)();
      expect(() => createReportFooter(doc, 1, 1)).not.toThrow();
    });
  });

  describe('addChartImage', () => {
    it('returns 0 when no image data provided', () => {
      const doc = new (mockJsPDF as any)();
      const height = addChartImage(doc, '', 14, 50, 180);
      expect(height).toBe(0);
    });
  });
});
