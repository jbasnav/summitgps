import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import L from 'leaflet';
import type { Track } from '../hooks/useRoutePlanner';

export interface PrintOptions {
  paperSize: 'a4' | 'letter' | 'a3';
  orientation: 'landscape' | 'portrait';
  title: string;
  showTitle: boolean;
  showLegend: boolean;
  showScaleBar: boolean;
  showNorthArrow: boolean;
  showElevationProfile: boolean;
  logoDataUrl?: string;
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface PaperDimension {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

// Paper dimensions at 150 DPI (highly sharp and crisp for print, safe for canvas memory)
export const PAPER_DIMENSIONS: Record<'a4' | 'letter' | 'a3', PaperDimension> = {
  a4: { widthMm: 210, heightMm: 297, widthPx: 1240, heightPx: 1754 },
  letter: { widthMm: 215.9, heightMm: 279.4, widthPx: 1275, heightPx: 1650 },
  a3: { widthMm: 297, heightMm: 420, widthPx: 1754, heightPx: 2480 },
};

/**
 * Captures the map container element to a Canvas using html2canvas-pro
 */
export async function captureMapToCanvas(mapContainer: HTMLElement): Promise<HTMLCanvasElement> {
  // Temporary disable control elements to clean up capture if needed, though html2canvas works on the container
  // We specify useCORS and allowTaint to allow loading map tiles from external domains (OpenStreetMap, etc.)
  return html2canvas(mapContainer, {
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: null,
    scale: 2, // Capture at 2x device pixel ratio for extra high resolution
    ignoreElements: (element) => {
      // Ignore Leaflet UI controls like zoom buttons, layer selectors, search bars
      return (
        element.classList.contains('leaflet-control-zoom') ||
        element.classList.contains('leaflet-control-layers') ||
        element.classList.contains('leaflet-control-search') ||
        element.classList.contains('search-container') ||
        element.classList.contains('map-control-btn') ||
        element.classList.contains('leaflet-control-attribution')
      );
    },
  });
}

/**
 * Calculates a nice, round scale bar based on Leaflet map state.
 * Returns scale size in meters, display label, and physical width in pixels for the scale bar.
 */
export function calculateScale(
  map: any, // L.Map
  targetWidthPx: number = 120
): { meters: number; pixels: number; label: string } {
  if (!map) return { meters: 0, pixels: 0, label: '' };

  const center = map.getCenter();
  
  // Calculate distance between center and a point targetWidthPx away horizontally
  const centerPoint = map.latLngToContainerPoint(center);
  const offsetPoint = L.point(centerPoint.x + targetWidthPx, centerPoint.y);
  const offsetLatLng = map.containerPointToLatLng(offsetPoint);
  
  const distanceMeters = center.distanceTo(offsetLatLng);

  // Find a "nice" rounded distance (e.g. 100m, 500m, 1km, 5km, 10km)
  const niceDistance = getNiceScaleDistance(distanceMeters);

  // Convert back to pixels
  const pixels = (niceDistance / distanceMeters) * targetWidthPx;
  
  const label = niceDistance >= 1000 
    ? `${niceDistance / 1000} km` 
    : `${niceDistance} m`;

  return {
    meters: niceDistance,
    pixels,
    label,
  };
}

/**
 * Rounds a raw distance to standard cartographic scale increments
 */
function getNiceScaleDistance(meters: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(meters)));
  const ratio = meters / magnitude;
  
  let niceRatio = 1;
  if (ratio >= 5) niceRatio = 5;
  else if (ratio >= 2) niceRatio = 2;
  else niceRatio = 1;
  
  return niceRatio * magnitude;
}

/**
 * Composes a full cartographic page on a single canvas combining map, margins, scale, arrow, and title
 */
export async function composeCartographicImage(
  mapCanvas: HTMLCanvasElement,
  mapInstance: any, // L.Map
  tracks: Track[],
  options: PrintOptions
): Promise<HTMLCanvasElement> {
  const dims = PAPER_DIMENSIONS[options.paperSize];
  
  // Determine target dimensions based on orientation
  const isLandscape = options.orientation === 'landscape';
  const pageW = isLandscape ? dims.heightPx : dims.widthPx;
  const pageH = isLandscape ? dims.widthPx : dims.heightPx;

  // Create document canvas
  const canvas = document.createElement('canvas');
  canvas.width = pageW;
  canvas.height = pageH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context for print composition');

  // 1. Draw Page Background (white)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pageW, pageH);

  // 2. Define Margins (classic cartographic layout: uniform border around the map)
  const marginPx = Math.round(pageW * 0.04); // 4% of width as margin
  const mapW = pageW - marginPx * 2;
  const mapH = pageH - marginPx * 2;
  const mapX = marginPx;
  const mapY = marginPx;

  // 3. Draw Map Image into the layout
  // We want to fill the map area. To do this beautifully without stretching, we crop/scale the captured map canvas
  ctx.save();
  // Draw card border with clipping to prevent spillover
  ctx.beginPath();
  ctx.rect(mapX, mapY, mapW, mapH);
  ctx.clip();

  // Draw the map image centered and cover
  const imgW = mapCanvas.width;
  const imgH = mapCanvas.height;
  const mapRatio = mapW / mapH;
  const imgRatio = imgW / imgH;

  let drawW = mapW;
  let drawH = mapH;
  let drawX = mapX;
  let drawY = mapY;

  if (imgRatio > mapRatio) {
    // Map canvas is wider, clip left/right
    drawW = mapH * imgRatio;
    drawX = mapX - (drawW - mapW) / 2;
  } else {
    // Map canvas is taller, clip top/bottom
    drawH = mapW / imgRatio;
    drawY = mapY - (drawH - mapH) / 2;
  }

  ctx.drawImage(mapCanvas, drawX, drawY, drawW, drawH);
  ctx.restore();

  // 4. Draw Map Frame (classic double border for high-end cartography)
  ctx.strokeStyle = '#0f172a'; // Deep dark slate
  ctx.lineWidth = 4;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX + 6, mapY + 6, mapW - 12, mapH - 12);

  // 5. Draw Cartographic Elements

  // A. Title Card (semi-transparent elegant floating panel at top center)
  if (options.showTitle && options.title) {
    ctx.save();
    
    // Configure text
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    const textMetrics = ctx.measureText(options.title);
    const cardW = Math.max(320, textMetrics.width + 40);
    const cardH = 65;
    const cardX = mapX + (mapW - cardW) / 2;
    const cardY = mapY + 15;

    // Draw background card (white glassmorphism look)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw title text
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(options.title, cardX + cardW / 2, cardY + 24);

    // Draw sub-text (date/coordinates)
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    const dateStr = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    ctx.fillText(`SummitGPS · ${dateStr}`, cardX + cardW / 2, cardY + 48);

    ctx.restore();
  }

  // B. North Arrow (elegant minimalist cartographic needle in top-right)
  if (options.showNorthArrow) {
    ctx.save();
    const arrowSize = 48;
    const arrowX = mapX + mapW - arrowSize - 20;
    const arrowY = mapY + 20;

    // Draw background circle for high contrast
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(arrowX + arrowSize/2, arrowY + arrowSize/2, arrowSize/2 + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
    ctx.stroke();

    // Draw North Arrow (dynamic pointer)
    const cx = arrowX + arrowSize / 2;
    const cy = arrowY + arrowSize / 2;

    // Outer ring
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, arrowSize / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    // North Pointer (top triangle black, bottom triangle white/empty)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - (arrowSize / 2 - 6)); // Top
    ctx.lineTo(cx - 5, cy + 2); // Bottom-left
    ctx.lineTo(cx, cy); // Center
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(cx, cy - (arrowSize / 2 - 6)); // Top
    ctx.lineTo(cx + 5, cy + 2); // Bottom-right
    ctx.lineTo(cx, cy); // Center
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // South Pointer
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(cx, cy + (arrowSize / 2 - 6)); // Bottom
    ctx.lineTo(cx - 4, cy - 2);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(cx, cy + (arrowSize / 2 - 6)); // Bottom
    ctx.lineTo(cx + 4, cy - 2);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // North "N" text
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('N', cx, cy - (arrowSize / 2 - 7));

    ctx.restore();
  }

  // C. Scale Bar (Placed in bottom-left inside map container)
  if (options.showScaleBar && mapInstance) {
    ctx.save();
    
    // Get accurate scale calculation
    const scale = calculateScale(mapInstance);
    if (scale.pixels > 0) {
      // Adjust scale bar width proportionally for our print layout resolution
      // mapCanvas width vs our mapW layout area
      const scaleFactor = mapW / mapCanvas.width;
      const printScaleWidth = scale.pixels * scaleFactor * 2; // Compensate for our high-res capture

      const scaleX = mapX + 20;
      const scaleY = mapY + mapH - 35;
      
      // Draw background panel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(scaleX - 8, scaleY - 18, printScaleWidth + 16, 28, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
      ctx.stroke();

      // Scale line (bar styling)
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(scaleX, scaleY);
      ctx.lineTo(scaleX + printScaleWidth, scaleY);
      // Tick left
      ctx.moveTo(scaleX, scaleY - 6);
      ctx.lineTo(scaleX, scaleY + 1);
      // Tick right
      ctx.moveTo(scaleX + printScaleWidth, scaleY - 6);
      ctx.lineTo(scaleX + printScaleWidth, scaleY + 1);
      // Tick center
      ctx.moveTo(scaleX + printScaleWidth / 2, scaleY - 4);
      ctx.lineTo(scaleX + printScaleWidth / 2, scaleY + 1);
      ctx.stroke();

      // Scale text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(scale.label, scaleX + printScaleWidth / 2, scaleY - 6);
    }
    ctx.restore();
  }

  // D. Legend Card (Placed in bottom-right, listing active routes/colors)
  const activeTracks = tracks.filter((t) => t.visible && t.points.length > 0);
  if (options.showLegend && activeTracks.length > 0) {
    ctx.save();

    const legendTitle = 'Leyenda Cartográfica';
    ctx.font = 'bold 10px system-ui, sans-serif';
    let maxLabelW = ctx.measureText(legendTitle).width;
    
    // Estimate width of names
    ctx.font = '9px system-ui, sans-serif';
    activeTracks.forEach((t) => {
      const trackName = t.name || 'Ruta sin nombre';
      const labelMetrics = ctx.measureText(trackName);
      if (labelMetrics.width > maxLabelW) maxLabelW = labelMetrics.width;
    });

    const cardW = Math.min(260, Math.max(160, maxLabelW + 40));
    const itemHeight = 16;
    const cardH = 28 + activeTracks.length * itemHeight + 8;
    const cardX = mapX + mapW - cardW - 20;
    const cardY = mapY + mapH - cardH - 20;

    // Draw background card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(legendTitle, cardX + 10, cardY + 10);

    // Separator line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 10, cardY + 24);
    ctx.lineTo(cardX + cardW - 10, cardY + 24);
    ctx.stroke();

    // Draw track items
    activeTracks.forEach((t, index) => {
      const itemY = cardY + 28 + index * itemHeight;
      const trackColor = t.color || '#10b981';
      const trackName = t.name || 'Ruta sin nombre';

      // Colored line representation
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 10, itemY + 6);
      ctx.lineTo(cardX + 25, itemY + 6);
      ctx.stroke();

      // Colored points/dots indicator on the line
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cardX + 17.5, itemY + 6, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Track text
      ctx.fillStyle = '#334155';
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      // Trim name if it overflows
      let displayName = trackName;
      if (ctx.measureText(displayName).width > cardW - 40) {
        while (ctx.measureText(displayName + '...').width > cardW - 40 && displayName.length > 0) {
          displayName = displayName.substring(0, displayName.length - 1);
        }
        displayName += '...';
      }
      
      ctx.fillText(displayName, cardX + 32, itemY + 1);
    });

    ctx.restore();
  }

  // E. Club Logo
  if (options.logoDataUrl) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        const logoMaxSize = 100;
        const ratio = img.width / img.height;
        const logoW = ratio >= 1 ? logoMaxSize : logoMaxSize * ratio;
        const logoH = ratio >= 1 ? logoMaxSize / ratio : logoMaxSize;

        const pad = 14;
        const pos = options.logoPosition ?? 'top-left';
        let logoX: number;
        let logoY: number;
        if (pos === 'top-left')     { logoX = mapX + pad;           logoY = mapY + pad; }
        else if (pos === 'top-right')    { logoX = mapX + mapW - logoW - pad; logoY = mapY + pad; }
        else if (pos === 'bottom-left')  { logoX = mapX + pad;           logoY = mapY + mapH - logoH - pad; }
        else                             { logoX = mapX + mapW - logoW - pad; logoY = mapY + mapH - logoH - pad; }

        const cardPad = 7;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.93)';
        ctx.beginPath();
        ctx.roundRect(logoX - cardPad, logoY - cardPad, logoW + cardPad * 2, logoH + cardPad * 2, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.drawImage(img, logoX, logoY, logoW, logoH);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = options.logoDataUrl!;
    });
  }

  return canvas;
}

/**
 * Downloads a canvas directly to a high-quality PNG image file
 */
export function downloadAsPNG(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a PDF file from a canvas and triggers download
 */
export function downloadAsPDF(
  canvas: HTMLCanvasElement,
  options: {
    paperSize: 'a4' | 'letter' | 'a3';
    orientation: 'landscape' | 'portrait';
    filename: string;
  }
): void {
  const isLandscape = options.orientation === 'landscape';
  
  // Initialize jsPDF document in millimeters with matching settings
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize,
  });

  const pdfW = isLandscape 
    ? pdf.internal.pageSize.getHeight() 
    : pdf.internal.pageSize.getWidth();
  
  const pdfH = isLandscape 
    ? pdf.internal.pageSize.getWidth() 
    : pdf.internal.pageSize.getHeight();

  // Draw the high resolution canvas image spanning exactly the full paper size
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  
  const filename = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
  pdf.save(filename);
}
