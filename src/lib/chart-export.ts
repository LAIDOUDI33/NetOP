import { toPng, toSvg } from 'html-to-image';

// ========== TYPES ==========

export interface CaptureOptions {
  pixelRatio?: number;
  backgroundColor?: string;
}

// ========== PUBLIC API ==========

/**
 * Captures a DOM element by ID and returns a base64 data URL (PNG).
 * Returns empty string on failure (element not found, render error, etc.).
 */
export async function captureChartAsImage(
  elementId: string,
  options?: CaptureOptions
): Promise<string> {
  const pixelRatio = options?.pixelRatio ?? 2;
  const backgroundColor = options?.backgroundColor ?? '#ffffff';

  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[chart-export] Element #${elementId} not found`);
    return '';
  }

  try {
    const dataUrl = await toPng(element, {
      pixelRatio,
      backgroundColor,
      cacheBust: true,
      // Include any embedded SVGs properly
      fetchRequestInit: {
    mode: 'cors',
  },
    });
    return dataUrl;
  } catch (error) {
    console.warn(`[chart-export] Failed to capture #${elementId}:`, error);
    return '';
  }
}

/**
 * Captures a DOM element by ID and triggers a browser download.
 * Supports 'png' and 'svg' formats.
 */
export async function downloadChartImage(
  elementId: string,
  filename: string,
  format: 'png' | 'svg' = 'png'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`[chart-export] Element #${elementId} not found`);
    return;
  }

  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    const ext = format;
    const fullFilename = `${filename}_${timestamp}.${ext}`;

    let dataUrl: string;

    if (format === 'svg') {
      dataUrl = await toSvg(element, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        fetchRequestInit: {
    mode: 'cors',
  },
      });
    } else {
      dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        fetchRequestInit: {
    mode: 'cors',
  },
      });
    }

    // Trigger download
    const link = document.createElement('a');
    link.download = fullFilename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.warn(`[chart-export] Failed to download #${elementId} as ${format}:`, error);
  }
}
