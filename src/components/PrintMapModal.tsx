import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Image as ImageIcon, 
  Check, 
  Map, 
  Eye, 
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { 
  composeCartographicImage, 
  downloadAsPNG, 
  downloadAsPDF, 
  captureMapToCanvas,
  PAPER_DIMENSIONS,
} from '../utils/printUtils';
import type { PrintOptions } from '../utils/printUtils';
import type { Track } from '../hooks/useRoutePlanner';

interface PrintMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapInstance: any; // L.Map
  tracks: Track[];
  defaultTitle?: string;
}

export default function PrintMapModal({
  isOpen,
  onClose,
  mapInstance,
  tracks,
  defaultTitle = 'Mapa de SummitGPS'
}: PrintMapModalProps) {
  // Option states
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'a3'>('a4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [title, setTitle] = useState(defaultTitle);
  const [showTitle, setShowTitle] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [showNorthArrow, setShowNorthArrow] = useState(true);
  
  // Progress states
  const [isCapturing, setIsCapturing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  
  // Canvas refs and states
  const [mapCapture, setMapCapture] = useState<HTMLCanvasElement | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const composedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Reset title if defaultTitle changes when opening
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle || 'Mapa de SummitGPS');
    }
  }, [isOpen, defaultTitle]);

  // Phase 1: Capture map on open
  useEffect(() => {
    if (!isOpen || !mapInstance) return;

    const performCapture = async () => {
      setIsCapturing(true);
      setCaptureError(null);
      setMapCapture(null);

      // Brief timeout to ensure any Leaflet rendering completes and modal animation finishes
      await new Promise((resolve) => setTimeout(resolve, 600));

      try {
        const container = mapInstance.getContainer();
        const canvas = await captureMapToCanvas(container);
        setMapCapture(canvas);
      } catch (err: any) {
        console.error('Map capture failed:', err);
        setCaptureError('No se pudo capturar el mapa del navegador. Por favor, inténtalo de nuevo.');
      } finally {
        setIsCapturing(false);
      }
    };

    performCapture();
  }, [isOpen, mapInstance]);

  // Phase 2: Re-compose print canvas when options change
  useEffect(() => {
    if (!mapCapture || !mapInstance) return;

    const updateComposition = async () => {
      setIsComposing(true);
      try {
        const options: PrintOptions = {
          paperSize,
          orientation,
          title,
          showTitle,
          showLegend,
          showScaleBar,
          showNorthArrow,
          showElevationProfile: false
        };

        const composed = await composeCartographicImage(
          mapCapture,
          mapInstance,
          tracks,
          options
        );
        
        composedCanvasRef.current = composed;
        setPreviewDataUrl(composed.toDataURL('image/jpeg', 0.85)); // Medium-high quality JPEG for fast UI preview rendering
      } catch (err) {
        console.error('Failed to compose print image:', err);
      } finally {
        setIsComposing(false);
      }
    };

    // Debounce slightly if title is being typed
    const timer = setTimeout(updateComposition, 300);
    return () => clearTimeout(timer);
  }, [
    mapCapture, 
    mapInstance, 
    tracks, 
    paperSize, 
    orientation, 
    title, 
    showTitle, 
    showLegend, 
    showScaleBar, 
    showNorthArrow
  ]);

  if (!isOpen) return null;

  const handleRecapture = async () => {
    if (!mapInstance) return;
    setIsCapturing(true);
    setCaptureError(null);
    setMapCapture(null);
    setPreviewDataUrl('');
    try {
      const container = mapInstance.getContainer();
      const canvas = await captureMapToCanvas(container);
      setMapCapture(canvas);
    } catch (err) {
      setCaptureError('No se pudo capturar el mapa. Inténtalo de nuevo.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownloadPNG = () => {
    if (!composedCanvasRef.current) return;
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_mapa`;
    downloadAsPNG(composedCanvasRef.current, filename);
  };

  const handleDownloadPDF = () => {
    if (!composedCanvasRef.current) return;
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_mapa`;
    downloadAsPDF(composedCanvasRef.current, {
      paperSize,
      orientation,
      filename
    });
  };

  // Physical aspect ratio for the sheet representation in the preview
  const activeDims = PAPER_DIMENSIONS[paperSize];
  const paperAspectRatio = orientation === 'landscape' 
    ? activeDims.heightMm / activeDims.widthMm 
    : activeDims.widthMm / activeDims.heightMm;

  const activeTracks = tracks.filter((t) => t.visible && t.points.length > 0);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row bg-[#080d0a]/95 backdrop-blur-xl animate-fade-in text-slate-100 font-sans">
      
      {/* LEFT SIDEBAR: Controls */}
      <div className="w-full md:w-[380px] bg-[#0b120e] border-r border-[#16271c] flex flex-col h-full shadow-2xl z-10">
        
        {/* Header */}
        <div className="p-5 border-b border-[#16271c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Imprimir Mapa</h2>
              <p className="text-[10px] text-slate-500">Composición cartográfica premium</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#111c16] hover:bg-[#182a20] border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Section: Map Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Título del Mapa</span>
              <button 
                onClick={() => setShowTitle(prev => !prev)}
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition-all ${
                  showTitle 
                    ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' 
                    : 'text-slate-500 bg-slate-500/5 hover:bg-slate-500/10'
                }`}
              >
                {showTitle ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                {showTitle ? 'Visible' : 'Oculto'}
              </button>
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!showTitle}
              placeholder="Escribe el título..."
              className="w-full bg-[#050907] border border-[#16271c] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50 disabled:opacity-40 transition-all font-semibold"
            />
          </div>

          {/* Section: Paper Size Selection */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tamaño del Papel</span>
            <div className="grid grid-cols-3 gap-2">
              {(['a4', 'letter', 'a3'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setPaperSize(size)}
                  className={`py-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                    paperSize === size
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                      : 'bg-[#060a08] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                  }`}
                >
                  <span className="text-xs font-bold uppercase">{size}</span>
                  <span className="text-[8px] text-slate-500 mt-0.5">
                    {size === 'a4' ? '210×297 mm' : size === 'letter' ? 'Carta' : '297×420 mm'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Orientation */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Orientación</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'landscape', label: 'Apaisado', desc: 'Horizontal', emoji: '🌅' },
                { id: 'portrait', label: 'Retrato', desc: 'Vertical', emoji: '🏙️' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setOrientation(mode.id as any)}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    orientation === mode.id
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                      : 'bg-[#060a08] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                  }`}
                >
                  <span className="text-lg">{mode.emoji}</span>
                  <div>
                    <div className="text-xs font-bold">{mode.label}</div>
                    <div className="text-[8px] text-slate-500">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Cartographic Overlays & Elements */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Elementos del Mapa</span>
            <div className="space-y-2 bg-[#050806] border border-[#16271c] p-3 rounded-xl">
              
              {/* Toggle Scale */}
              <label 
                onClick={() => setShowScaleBar(!showScaleBar)}
                className="flex items-center justify-between cursor-pointer group py-1 select-none"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${
                    showScaleBar 
                      ? 'bg-emerald-500 border-emerald-600 text-white' 
                      : 'border-slate-600 bg-transparent group-hover:border-slate-500'
                  }`}>
                    {showScaleBar && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Barra de Escala</span>
                </div>
                <span className="text-[9px] text-slate-500">Métrica</span>
              </label>

              {/* Toggle North Arrow */}
              <label 
                onClick={() => setShowNorthArrow(!showNorthArrow)}
                className="flex items-center justify-between cursor-pointer group py-1 select-none"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${
                    showNorthArrow 
                      ? 'bg-emerald-500 border-emerald-600 text-white' 
                      : 'border-slate-600 bg-transparent group-hover:border-slate-500'
                  }`}>
                    {showNorthArrow && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                  </div>
                  <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors">Flecha de Norte</span>
                </div>
                <span className="text-[9px] text-slate-500">Orientación</span>
              </label>

              {/* Toggle Legend */}
              <label className="flex items-center justify-between cursor-pointer group py-1 disabled:opacity-40">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    checked={showLegend}
                    disabled={activeTracks.length === 0}
                    onChange={(e) => setShowLegend(e.target.checked)}
                    className="hidden"
                  />
                  <button 
                    disabled={activeTracks.length === 0}
                    onClick={() => setShowLegend(p => !p)}
                    className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center cursor-pointer ${
                      showLegend && activeTracks.length > 0
                        ? 'bg-emerald-500 border-emerald-600 text-white' 
                        : 'border-slate-600 bg-transparent hover:border-slate-500'
                    }`}
                  >
                    {showLegend && activeTracks.length > 0 && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                  </button>
                  <span className={`text-xs transition-colors ${
                    activeTracks.length === 0 
                      ? 'text-slate-600 cursor-not-allowed' 
                      : 'text-slate-300 group-hover:text-slate-100 cursor-pointer'
                  }`}>
                    Leyenda de Rutas
                  </span>
                </div>
                <span className="text-[9px] text-slate-500">
                  {activeTracks.length > 0 ? `${activeTracks.length} activa(s)` : 'Ninguna'}
                </span>
              </label>

            </div>
          </div>

          {/* Alert / Notice */}
          <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl text-[10px] text-amber-400/80 leading-normal">
            💡 <strong>Consejo de Impresión:</strong> Para lograr el resultado óptimo en PDF, mantén centrado tu trazado o track de interés en el mapa antes de abrir esta ventana.
          </div>

        </div>

        {/* Footer: Export actions */}
        <div className="p-5 border-t border-[#16271c] bg-[#080e0a] space-y-2">
          
          <button
            onClick={handleDownloadPNG}
            disabled={isCapturing || isComposing || !previewDataUrl}
            className="w-full bg-[#111c16] hover:bg-[#182a20] border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 hover:text-emerald-200 py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Descargar Imagen PNG</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isCapturing || isComposing || !previewDataUrl}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-[#050806] font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            <span>Descargar Documento PDF</span>
          </button>

        </div>

      </div>

      {/* RIGHT SIDE: Interactive Preview Screen */}
      <div className="flex-1 bg-[#050706] flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
        
        {/* Glow Effects in the background */}
        <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] -top-40 -right-40 pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px] -bottom-20 -left-20 pointer-events-none" />

        {/* Top bar floating controls */}
        <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-[#0b120e]/80 border border-[#16271c] px-3.5 py-1.5 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Vista Previa Cartográfica</span>
          </div>

          <button
            onClick={handleRecapture}
            disabled={isCapturing || isComposing}
            className="pointer-events-auto w-8 h-8 rounded-lg bg-[#0b120e]/80 hover:bg-[#182a20] border border-white/5 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center cursor-pointer disabled:opacity-30"
            title="Recapturar mapa actual"
          >
            <RefreshCw className={`w-4 h-4 ${isCapturing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Map Sheet Mockup / Preview Container */}
        <div className="w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center">
          
          {isCapturing ? (
            <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin" />
                <Map className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-200">Capturando Lienzo</h3>
                <p className="text-[10px] text-slate-500">Fotografiando mapa Leaflet y renderizando capas vectoriales...</p>
              </div>
            </div>
          ) : captureError ? (
            <div className="flex flex-col items-center text-center space-y-4 max-w-sm bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
              <X className="w-8 h-8 text-red-400" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-red-300">Error de Captura</h3>
                <p className="text-[10px] text-slate-400">{captureError}</p>
              </div>
              <button 
                onClick={handleRecapture}
                className="bg-[#1c1214] border border-red-500/30 hover:border-red-500/50 text-red-300 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all"
              >
                Reintentar Captura
              </button>
            </div>
          ) : previewDataUrl ? (
            // Composed Preview Paper Mockup
            <div 
              className="relative bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-[#ffffff15] rounded-sm overflow-hidden flex items-center justify-center transition-all duration-300 hover:scale-[1.01]"
              style={{
                aspectRatio: paperAspectRatio,
                maxHeight: '100%',
                maxWidth: '100%',
                width: orientation === 'landscape' ? '100%' : 'auto',
                height: orientation === 'portrait' ? '100%' : 'auto',
              }}
            >
              {isComposing && (
                <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px] flex items-center justify-center z-10 animate-fade-in">
                  <div className="flex items-center gap-2.5 bg-[#0b120e]/95 border border-[#16271c] px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-400 shadow-xl">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Actualizando Composición...</span>
                  </div>
                </div>
              )}
              
              <img 
                src={previewDataUrl} 
                alt="Composed Cartographic Preview" 
                className="w-full h-full object-contain pointer-events-none bg-slate-900"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20 text-slate-400">
                <Printer className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-400">Preparando papel</h3>
                <p className="text-[10px] text-slate-500">Inicializando renderizador...</p>
              </div>
            </div>
          )}

        </div>

        {/* Bottom scale/aspect metadata info */}
        {!isCapturing && !captureError && previewDataUrl && (
          <div className="absolute bottom-4 text-[9px] text-slate-600 bg-slate-500/5 border border-slate-500/10 px-3 py-1.5 rounded-lg flex items-center gap-4">
            <div>
              Dimensión: <strong className="text-slate-400">{orientation === 'landscape' ? `${activeDims.heightMm} x ${activeDims.widthMm} mm` : `${activeDims.widthMm} x ${activeDims.heightMm} mm`}</strong>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-800" />
            <div>
              Resolución: <strong className="text-slate-400">{orientation === 'landscape' ? `${activeDims.heightPx} x ${activeDims.widthPx} px` : `${activeDims.widthPx} x ${activeDims.heightPx} px`}</strong>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
