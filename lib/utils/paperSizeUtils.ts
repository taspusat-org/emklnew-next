interface PaperSizeConfig {
  name: string;
  layout: 'portrait' | 'landscape';
  description: string;
}

interface PaperSizeData {
  paperSizes: Record<string, PaperSizeConfig>;
  default: {
    name: string;
    layout: 'portrait' | 'landscape';
  };
  tolerance: number;
}

let paperSizeCache: PaperSizeData | null = null;

export async function loadPaperSizeConfig(): Promise<PaperSizeData> {
  if (paperSizeCache) {
    return paperSizeCache;
  }

  try {
    // cache-busting agar tidak pakai versi lama dari browser cache
    const response = await fetch(`/config/papersize.json?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Failed to load paper size config');
    }
    paperSizeCache = await response.json();
    return paperSizeCache!;
  } catch (error) {
    console.error('Error loading paper size config:', error);
    return {
      paperSizes: {},
      default: {
        name: 'CUSTOM_A4',
        layout: 'portrait'
      },
      tolerance: 3
    };
  }
}

function isWithinTolerance(
  value1: number,
  value2: number,
  tolerance: number
): boolean {
  return Math.abs(value1 - value2) <= tolerance;
}

function findMatchingSize(
  width: number,
  height: number,
  config: PaperSizeData
): PaperSizeConfig | null {
  const tolerance = config.tolerance || 3;

  for (const [sizeKey, paperConfig] of Object.entries(config.paperSizes)) {
    const [configWidth, configHeight] = sizeKey.split('x').map(Number);

    // Cek dimensi as-is
    if (
      isWithinTolerance(width, configWidth, tolerance) &&
      isWithinTolerance(height, configHeight, tolerance)
    ) {
      return paperConfig;
    }

    // Cek dimensi dibalik (rotated)
    if (
      isWithinTolerance(width, configHeight, tolerance) &&
      isWithinTolerance(height, configWidth, tolerance)
    ) {
      const flippedLayout: 'portrait' | 'landscape' =
        paperConfig.layout === 'portrait' ? 'landscape' : 'portrait';
      return { ...paperConfig, layout: flippedLayout };
    }
  }

  return null;
}

export async function detectPaperSize(
  width: number,
  height: number
): Promise<{
  paperSize: string;
  layout: 'portrait' | 'landscape';
}> {
  const config = await loadPaperSizeConfig();

  const roundedWidth = Math.round(width * 10) / 10;
  const roundedHeight = Math.round(height * 10) / 10;

  console.log('Detecting paper size:', {
    width: roundedWidth,
    height: roundedHeight
  });

  const matchedSize = findMatchingSize(roundedWidth, roundedHeight, config);

  if (matchedSize) {
    console.log('Matched paper size:', matchedSize);
    return {
      paperSize: matchedSize.name,
      layout: matchedSize.layout
    };
  }

  // Fallback: orientasi dari dimensi aktual
  const layout: 'portrait' | 'landscape' =
    roundedWidth > roundedHeight ? 'landscape' : 'portrait';

  console.log('No exact match, fallback:', {
    paperSize: config.default.name,
    layout,
    actualWidth: roundedWidth,
    actualHeight: roundedHeight
  });

  return {
    paperSize: config.default.name,
    layout
  };
}

export async function extractPaperSizeFromMRT(mrtUrl: string): Promise<{
  paperSize: string;
  layout: 'portrait' | 'landscape';
} | null> {
  try {
    const response = await fetch(mrtUrl);
    const text = await response.text();
    const trimmed = text.trim();

    // ── FORMAT JSON ──────────────────────────────────────────
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const json = JSON.parse(trimmed);

        const pageWidth =
          json?.PageWidth ?? json?.page?.PageWidth ?? json?.report?.PageWidth;
        const pageHeight =
          json?.PageHeight ??
          json?.page?.PageHeight ??
          json?.report?.PageHeight;

        if (pageWidth != null && pageHeight != null) {
          const w = parseFloat(String(pageWidth));
          const h = parseFloat(String(pageHeight));
          console.log('MRT JSON PageSize:', { w, h });
          return await detectPaperSize(w, h);
        }
      } catch (jsonErr) {
        console.warn('MRT JSON parse failed, trying XML:', jsonErr);
      }
    }

    // ── FORMAT XML ──────────────────────────────────────────
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(trimmed, 'text/xml');

    const reportUnit = xmlDoc.querySelector('ReportUnit');
    const unitAttr = reportUnit?.getAttribute('Unit');

    let unitMultiplier = 1;
    if (unitAttr === 'HundrethsOfInch') {
      unitMultiplier = 0.254;
    } else if (unitAttr === 'Inches') {
      unitMultiplier = 25.4;
    }

    // Coba PaperSize element (format "w,h")
    const paperSizeElement = xmlDoc.querySelector('PaperSize');
    if (paperSizeElement) {
      const parts = paperSizeElement.textContent?.split(',');
      if (parts && parts.length >= 2) {
        const w = parseFloat(parts[0]) * unitMultiplier;
        const h = parseFloat(parts[1]) * unitMultiplier;
        if (!isNaN(w) && !isNaN(h)) {
          return await detectPaperSize(w, h);
        }
      }
    }

    // Coba Page element dengan attribute PageWidth/PageHeight
    const page = xmlDoc.querySelector('Page');
    if (page) {
      const pw = page.getAttribute('PageWidth');
      const ph = page.getAttribute('PageHeight');
      if (pw && ph) {
        const w = parseFloat(pw) * unitMultiplier;
        const h = parseFloat(ph) * unitMultiplier;
        if (!isNaN(w) && !isNaN(h)) {
          return await detectPaperSize(w, h);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting paper size from MRT:', error);
    return null;
  }
}

export async function extractPaperSizeFromPDF(pdfUrl: string): Promise<{
  paperSize: string;
  layout: 'portrait' | 'landscape';
} | null> {
  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const text = new TextDecoder('latin1').decode(uint8Array);

    const mediaBoxMatch = text.match(
      /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/
    );

    if (mediaBoxMatch) {
      const width =
        (parseFloat(mediaBoxMatch[3]) - parseFloat(mediaBoxMatch[1])) *
        0.352778;
      const height =
        (parseFloat(mediaBoxMatch[4]) - parseFloat(mediaBoxMatch[2])) *
        0.352778;

      return await detectPaperSize(width, height);
    }

    return null;
  } catch (error) {
    console.error('Error extracting paper size from PDF:', error);
    return null;
  }
}
