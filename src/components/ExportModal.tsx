import { useState, useEffect } from "react";
import { X, Download, Cloud, Copy, Check, Loader2, Lock, Settings2, FileText, Globe, Layers, CheckSquare, Square } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";
import { useCustomDialog } from "./CustomDialog";

export interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  distance?: number;
  time?: string;
  heartRate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  speed?: number;
}

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  note: string;
  color?: string;
  groupId?: string;
}

export interface Track {
  id: string;
  name: string;
  points: RoutePoint[];
  waypoints: Waypoint[];
  visible: boolean;
  color: string;
  collectionId?: string;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  allWaypoints?: Waypoint[];
  collectionName?: string;
  user: any | null;
}

interface ExportOptions {
  includeElevation: boolean;
  includeTime: boolean;
  includeHeartRate: boolean;
  includeCadence: boolean;
  includePower: boolean;
  includeTemperature: boolean;
  unifyBatch: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  tracks,
  allWaypoints = [],
  collectionName,
  user,
}: ExportModalProps) {
  const { customAlert } = useCustomDialog();
  const [format, setFormat] = useState<"gpx" | "kml" | "geojson">("gpx");
  const [options, setOptions] = useState<ExportOptions>({
    includeElevation: true,
    includeTime: true,
    includeHeartRate: true,
    includeCadence: true,
    includePower: true,
    includeTemperature: true,
    unifyBatch: true,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCloudUrl(null);
      setCopied(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isBatch = tracks.length > 1 || !!collectionName;
  const currentWaypoints = isBatch 
    ? allWaypoints 
    : (tracks[0]?.waypoints || []);

  const nameToUse = collectionName || tracks[0]?.name || "Summit_GPS_Ruta";

  const handleToggleOption = (key: keyof Omit<ExportOptions, "unifyBatch">) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper: filters points based on chosen options
  const filterPoints = (pts: RoutePoint[]): RoutePoint[] => {
    return pts.map((pt) => {
      const newPt = { ...pt };
      if (!options.includeElevation) delete newPt.elevation;
      if (!options.includeTime) delete newPt.time;
      if (!options.includeHeartRate) delete newPt.heartRate;
      if (!options.includeCadence) delete newPt.cadence;
      if (!options.includePower) delete newPt.power;
      if (!options.includeTemperature) delete newPt.temperature;
      return newPt;
    });
  };

  // ─── GPX CONSOLIDATOR / EXPORTER ───
  const generateGPX = (): string => {
    const creator = "Summit GPS";
    const time = new Date().toISOString();
    const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="${creator}" 
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:gpxtrkx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd">
  <metadata>
    <name>${esc(nameToUse)}</name>
    <time>${time}</time>
  </metadata>\n`;

    // Add consolidated waypoints in root
    const wpts = isBatch ? currentWaypoints : tracks[0]?.waypoints || [];
    wpts.forEach((wpt) => {
      gpx += `  <wpt lat="${wpt.lat.toFixed(6)}" lon="${wpt.lng.toFixed(6)}">
    <name>${esc(wpt.name)}</name>
    <desc>${esc(wpt.note)}</desc>
    <sym>${esc(wpt.icon)}</sym>
  </wpt>\n`;
    });

    // Add Tracks
    tracks.forEach((track) => {
      if (track.points.length === 0) return;
      const filtered = filterPoints(track.points);

      gpx += `  <trk>
    <name>${esc(track.name)}</name>
    <trkseg>\n`;

      filtered.forEach((pt) => {
        gpx += `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lng.toFixed(6)}">`;
        if (pt.elevation !== undefined) {
          gpx += `<ele>${pt.elevation.toFixed(2)}</ele>`;
        }
        if (pt.time) {
          gpx += `<time>${pt.time}</time>`;
        }

        const hasExt = pt.heartRate !== undefined || pt.cadence !== undefined || pt.temperature !== undefined || pt.power !== undefined;
        if (hasExt) {
          gpx += `<extensions>`;
          if (pt.heartRate !== undefined || pt.cadence !== undefined || pt.temperature !== undefined) {
            gpx += `<gpxtrkx:TrackPointExtension>`;
            if (pt.heartRate !== undefined) {
              gpx += `<gpxtrkx:hr>${pt.heartRate}</gpxtrkx:hr>`;
            }
            if (pt.cadence !== undefined) {
              gpx += `<gpxtrkx:cad>${pt.cadence}</gpxtrkx:cad>`;
            }
            if (pt.temperature !== undefined) {
              gpx += `<gpxtrkx:atemp>${pt.temperature}</gpxtrkx:atemp>`;
            }
            gpx += `</gpxtrkx:TrackPointExtension>`;
          }
          if (pt.power !== undefined) {
            gpx += `<power>${pt.power}</power>`;
          }
          gpx += `</extensions>`;
        }
        gpx += `</trkpt>\n`;
      });

      gpx += `    </trkseg>
  </trk>\n`;
    });

    gpx += `</gpx>`;
    return gpx;
  };

  // ─── KML CONSOLIDATOR / EXPORTER ───
  const generateKML = (): string => {
    const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${esc(nameToUse)}</name>
    <description>Rutas y Marcadores exportados desde SummitGPS</description>\n`;

    // Global style for lines
    kml += `    <Style id="summit_line">
      <LineStyle>
        <color>ff00b910</color> <!-- emerald -->
        <width>4</width>
      </LineStyle>
    </Style>\n`;

    // Process each track as a folder
    tracks.forEach((track) => {
      kml += `    <Folder>
      <name>${esc(track.name)}</name>\n`;

      // 1. Waypoints of this track
      const trackWpts = isBatch 
        ? currentWaypoints.filter(w => w.groupId === track.id || !w.groupId)
        : track.waypoints;

      trackWpts.forEach((w) => {
        kml += `      <Placemark>
        <name>${esc(w.name)}</name>
        <description>${esc(w.note)}</description>
        <Point>
          <coordinates>${w.lng.toFixed(6)},${w.lat.toFixed(6)},0</coordinates>
        </Point>
      </Placemark>\n`;
      });

      // 2. Track line
      if (track.points.length > 0) {
        const filtered = filterPoints(track.points);
        kml += `      <Placemark>
        <name>Trazado - ${esc(track.name)}</name>
        <styleUrl>#summit_line</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>\n`;

        filtered.forEach((pt) => {
          const eleVal = pt.elevation !== undefined ? pt.elevation.toFixed(1) : "0";
          kml += `            ${pt.lng.toFixed(6)},${pt.lat.toFixed(6)},${eleVal}\n`;
        });

        kml += `          </coordinates>
        </LineString>
      </Placemark>\n`;
      }

      kml += `    </Folder>\n`;
    });

    kml += `  </Document>
</kml>`;
    return kml;
  };

  // ─── GEOJSON CONSOLIDATOR / EXPORTER ───
  const generateGeoJSON = (): string => {
    const features: any[] = [];

    tracks.forEach((track) => {
      // 1. Track points as LineString
      if (track.points.length > 0) {
        const filtered = filterPoints(track.points);
        const coordinates = filtered.map((pt) => {
          if (pt.elevation !== undefined) {
            return [pt.lng, pt.lat, pt.elevation];
          }
          return [pt.lng, pt.lat];
        });

        features.push({
          type: "Feature",
          properties: {
            name: track.name,
            type: "track",
            color: track.color,
          },
          geometry: {
            type: "LineString",
            coordinates,
          },
        });
      }

      // 2. Waypoints as individual Point features
      const trackWpts = isBatch
        ? currentWaypoints.filter(w => w.groupId === track.id || !w.groupId)
        : track.waypoints;

      trackWpts.forEach((w) => {
        features.push({
          type: "Feature",
          properties: {
            name: w.name,
            note: w.note,
            icon: w.icon,
            color: w.color || "#10b981",
            type: "waypoint",
          },
          geometry: {
            type: "Point",
            coordinates: [w.lng, w.lat],
          },
        });
      });
    });

    const geoJsonObj = {
      type: "FeatureCollection",
      name: nameToUse,
      features,
    };

    return JSON.stringify(geoJsonObj, null, 2);
  };

  // ─── GET CONTENT STRING ───
  const getFileContent = (): string => {
    if (format === "kml") return generateKML();
    if (format === "geojson") return generateGeoJSON();
    return generateGPX();
  };

  const getMimeType = (): string => {
    if (format === "kml") return "application/vnd.google-earth.kml+xml";
    if (format === "geojson") return "application/geo+json";
    return "application/gpx+xml";
  };

  const getFileExtension = (): string => {
    if (format === "kml") return "kml";
    if (format === "geojson") return "geojson";
    return "gpx";
  };

  // ─── LOCAL DOWNLOAD HANDLER ───
  const handleLocalDownload = () => {
    const text = getFileContent();
    const blob = new Blob([text], { type: getMimeType() });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const formattedName = nameToUse.toLowerCase().replace(/\s+/g, "_");
    link.download = `${formattedName}.${getFileExtension()}`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onClose();
  };

  // ─── CLOUD UPLOAD HANDLER (SUPABASE STORAGE) ───
  const handleCloudUpload = async () => {
    if (!user) {
      await customAlert("Por favor, inicia sesión para poder guardar y compartir tus rutas en la nube.");
      return;
    }

    if (!isSupabaseConfigured) {
      await customAlert("La nube de Supabase no está configurada en este entorno.");
      return;
    }

    setLoading(true);
    setCloudUrl(null);
    setCopied(false);

    try {
      const text = getFileContent();
      const blob = new Blob([text], { type: getMimeType() });
      const fileExt = getFileExtension();
      
      const formattedName = nameToUse.toLowerCase().replace(/\s+/g, "_");
      const fileName = `${Date.now()}-${formattedName}.${fileExt}`;
      const filePath = `exports/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("waypoint-photos")
        .upload(filePath, blob, {
          contentType: getMimeType(),
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("waypoint-photos")
        .getPublicUrl(filePath);

      setCloudUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error("Cloud upload error:", err);
      await customAlert("Error al subir a la nube: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // ─── COPY TO CLIPBOARD HANDLER ───
  const handleCopyLink = () => {
    if (!cloudUrl) return;
    navigator.clipboard.writeText(cloudUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 select-none">
      {/* Background shadow & closing on click */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in cursor-default" 
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#1b3d2b] bg-[#0c120f]/95 shadow-2xl backdrop-blur-md p-6 overflow-hidden flex flex-col z-10 animate-slide-in-top">
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-[#131b17] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-[#1b3d2b]">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Settings2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              {isBatch ? "Exportar Lote de Biblioteca" : "Exportar Ruta Activa"}
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold truncate block mt-0.5" title={nameToUse}>
              Ruta: <span className="text-emerald-400/80">{nameToUse}</span>
            </span>
          </div>
        </div>

        {/* Tabs for choosing format */}
        <div className="mt-5 space-y-2">
          <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block">1. Seleccionar Formato</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "gpx" as const, name: "GPX", desc: "Universal y GPS", icon: FileText, color: "text-emerald-400 hover:border-emerald-500/50" },
              { id: "kml" as const, name: "KML", desc: "Google Earth", icon: Globe, color: "text-cyan-400 hover:border-cyan-500/50" },
              { id: "geojson" as const, name: "GeoJSON", desc: "Sistemas GIS", icon: Layers, color: "text-violet-400 hover:border-violet-500/50" },
            ].map((fmt) => {
              const active = format === fmt.id;
              const Icon = fmt.icon;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  className={`group flex flex-col items-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    active
                      ? "bg-emerald-500/10 border-emerald-400/60 ring-1 ring-emerald-500/15"
                      : "bg-[#0b100d] border-white/5 hover:border-white/10 hover:bg-[#0f1612]"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1.5 ${active ? fmt.color.split(" ")[0] : "text-slate-400"}`} />
                  <span className={`text-xs font-bold ${active ? "text-slate-100" : "text-slate-300"}`}>
                    {fmt.name}
                  </span>
                  <span className="text-[8.5px] text-slate-500 font-medium leading-none mt-1">
                    {fmt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Filters Section */}
        <div className="mt-5 space-y-2">
          <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block">2. Filtros de Datos (Metadata)</span>
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#0b100d]/80 border border-white/5">
            {[
              { id: "includeElevation" as const, label: "⛰️ Altura e Isolíneas", desc: "Altitud en cada trkpt" },
              { id: "includeTime" as const, label: "⏱️ Tiempos / Fecha", desc: "Timestamps originales" },
              { id: "includeHeartRate" as const, label: "💓 Frecuencia Cardíaca", desc: "Sensor HR en track" },
              { id: "includeCadence" as const, label: "🔄 Cadencia de Pedaleo", desc: "Sensor CAD en track" },
              { id: "includePower" as const, label: "⚡ Potencia (Watts)", desc: "Entrenamientos activos" },
              { id: "includeTemperature" as const, label: "🌡️ Temperatura", desc: "Grados registrados" },
            ].map((opt) => {
              const active = options[opt.id];
              return (
                <div
                  key={opt.id}
                  onClick={() => handleToggleOption(opt.id)}
                  className="flex items-start gap-2.5 cursor-pointer group select-none"
                >
                  <div className={`mt-0.5 shrink-0 transition-colors ${active ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-500"}`}>
                    {active ? <CheckSquare className="w-4 h-4 stroke-[2.5]" /> : <Square className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <span className={`text-[11px] font-bold block leading-none transition-colors ${active ? "text-slate-200" : "text-slate-400"}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-1 block leading-none font-medium">
                      {opt.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cloud Hosting Section */}
        <div className="mt-5 space-y-2">
          <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest block">3. Almacenamiento en la Nube y Compartir</span>
          <div className="p-4 rounded-2xl bg-[#0c120f]/60 border border-[#1b3d2b] relative overflow-hidden">
            {user ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-[11px] font-bold text-slate-200 block leading-tight">Nube Activa de SummitGPS</span>
                    <span className="text-[9px] text-slate-500 font-medium block">Sube el archivo al Cloud Storage para generar un enlace de descarga público.</span>
                  </div>
                  <button
                    onClick={handleCloudUpload}
                    disabled={loading}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-emerald-400 text-[10.5px] font-bold tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {loading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cloud className="w-3.5 h-3.5" />
                    )}
                    Subir
                  </button>
                </div>

                {cloudUrl && (
                  <div className="flex items-center gap-2 bg-[#060a08]/85 border border-[#1b3d2b] rounded-xl p-2 animate-fade-in relative z-10">
                    <input
                      type="text"
                      readOnly
                      value={cloudUrl}
                      className="flex-1 bg-transparent border-none text-[10px] text-emerald-400/80 font-mono px-1 focus:outline-none truncate"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer select-none ${
                        copied
                          ? "bg-emerald-500 border-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-scale-up"
                          : "bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500 text-emerald-400"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-amber-400/90 block leading-tight">Modo Invitado (Persistencia Local)</span>
                  <p className="text-[8.5px] text-slate-500 font-semibold leading-relaxed">
                    Inicia sesión en SummitGPS para almacenar de forma remota tus tracks y poder compartir enlaces directos de tus rutas con un solo clic.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#1b3d2b] pt-5 mt-6 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-transparent hover:bg-white/5 border border-white/5 hover:border-white/10 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleLocalDownload}
            className="px-5 py-2.5 bg-emerald-500 text-black hover:bg-emerald-400 active:scale-[0.98] text-xs font-bold uppercase tracking-wider transition-all rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            Descargar Archivo Local
          </button>
        </div>
      </div>
    </div>
  );
}
