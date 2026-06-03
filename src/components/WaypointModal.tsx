import React, { useState } from "react";
import { X, MapPin, Upload, Trash2, Camera } from "lucide-react";
import { useCustomDialog } from "./CustomDialog";
import { WAYPOINT_CATEGORIES } from "../utils/iconLibrary";

// Coordinate converter helpers
function latLngToDms(lat: number, lng: number) {
  const getDms = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? "N" : "S") : (val >= 0 ? "E" : "W");
    const absVal = Math.abs(val);
    const deg = Math.floor(absVal);
    const minVal = (absVal - deg) * 60;
    const min = Math.floor(minVal);
    const sec = Math.round((minVal - min) * 60 * 10) / 10;
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };
  return {
    lat: getDms(lat, true),
    lng: getDms(lng, false),
  };
}

function latLngToUtm(lat: number, lng: number, datum: "WGS84" | "ED50" = "WGS84") {
  let a = 6378137.0;
  let f = 1 / 298.257223563;
  
  if (datum === "ED50") {
    a = 6378388.0;
    f = 1 / 297.0;
    // Spain ED50 to WGS84 localized datum translation shift
    lat = lat + 0.00122;
    lng = lng + 0.00155;
  }

  const phi = lat * Math.PI / 180;
  const lambda = lng * Math.PI / 180;
  const lambda0 = -3 * Math.PI / 180; // Zone 30 Central Meridian
  
  const b = a * (1 - f);
  const e2 = (a*a - b*b) / (a*a);
  const ePrime2 = (a*a - b*b) / (b*b);
  const k0 = 0.9996;
  const falseEasting = 500000;
  
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
  const T = Math.tan(phi) * Math.tan(phi);
  const C = ePrime2 * Math.cos(phi) * Math.cos(phi);
  const A = (lambda - lambda0) * Math.cos(phi);
  
  const M = a * (
    (1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * phi
    - (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*phi)
    + (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*phi)
    - (35*e2*e2*e2/3072) * Math.sin(6*phi)
  );
  
  const x = falseEasting + k0 * N * (
    A + (1 - T + C) * A*A*A/6
    + (5 - 18*T + T*T + 72*C - 58*ePrime2) * Math.pow(A, 5)/120
  );
  
  const y = k0 * (
    M + N * Math.tan(phi) * (
      A*A/2 + (5 - T + 9*C + 4*C*C) * Math.pow(A, 4)/24
      + (61 - 58*T + T*T + 600*C - 330*ePrime2) * Math.pow(A, 6)/720
    )
  );
  
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

interface WaypointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    name: string; 
    icon: string; 
    note: string; 
    color: string; 
    groupId: string; 
    completed: boolean; 
    image?: string; 
    link?: string; 
    imageFile?: File | null;
    elevation?: number;
  }) => void;
  initialData?: { name: string; icon: string; note: string; color: string; groupId?: string; completed?: boolean; image?: string; link?: string; lat?: number; lng?: number; elevation?: number };
  onDelete?: () => void;
  groups: any[]; // Renders available WaypointGroups
}



const COLORS = [
  { value: "#10b981", name: "Esmeralda" }, // Emerald
  { value: "#3b82f6", name: "Azul" },     // Blue
  { value: "#ef4444", name: "Rojo" },     // Red
  { value: "#f59e0b", name: "Ámbar" },    // Amber
  { value: "#8b5cf6", name: "Violeta" },  // Violet
  { value: "#ec4899", name: "Rosa" },     // Pink
];

export function WaypointModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  onDelete,
  groups,
}: WaypointModalProps) {
  const { customConfirm } = useCustomDialog();
  const [name, setName] = useState(initialData?.name || "");
  const [icon, setIcon] = useState(initialData?.icon || "mountain");
  const [note, setNote] = useState(initialData?.note || "");
  const [color, setColor] = useState(initialData?.color || "#10b981");
  const [groupId, setGroupId] = useState(initialData?.groupId || "default");
  const [completed, setCompleted] = useState(initialData?.completed || false);
  const [image, setImage] = useState(initialData?.image || "");
  const [link, setLink] = useState(initialData?.link || "");

  // Local File Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image || null);

  // Elevation states
  const [elevation, setElevation] = useState<number | null>(initialData?.elevation !== undefined ? initialData.elevation : null);
  const [fetchingElevation, setFetchingElevation] = useState(false);
  const [activeCategory, setActiveCategory] = useState("basic");

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setIcon(initialData?.icon || "mountain");
      setNote(initialData?.note || "");
      setColor(initialData?.color || "#10b981");
      setGroupId(initialData?.groupId || "default");
      setCompleted(initialData?.completed || false);
      setImage(initialData?.image || "");
      setLink(initialData?.link || "");
      setImageFile(null);
      setImagePreview(initialData?.image || null);
      setElevation(initialData?.elevation !== undefined ? initialData.elevation : null);
      setActiveCategory("basic");

      // Fetch elevation from Open-Meteo if coordinates are present AND elevation is not already provided
      if (initialData?.lat !== undefined && initialData?.lng !== undefined && initialData?.elevation === undefined) {
        setFetchingElevation(true);
        fetch(`https://api.open-meteo.com/v1/elevation?latitude=${initialData.lat}&longitude=${initialData.lng}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && typeof data.elevation?.[0] === "number") {
              const elevVal = Math.round(data.elevation[0]);
              setElevation(elevVal);

              // Auto-inject to notes if it's a NEW waypoint (no name and no note yet)
              if (!initialData.name && !initialData.note) {
                setNote((prev) => {
                  const altStr = `Altitud: ${elevVal} m (${Math.round(elevVal * 3.28084)} ft)`;
                  if (prev.includes("Altitud:")) return prev;
                  return prev ? `${prev}\n${altStr}` : altStr;
                });
              }
            }
          })
          .catch((err) => console.error("Error fetching elevation:", err))
          .finally(() => setFetchingElevation(false));
      }
    }
  }, [isOpen, initialData]);

  const handleAppendElevationToNotes = () => {
    if (elevation === null) return;
    const altStr = `Altitud: ${elevation} m (${Math.round(elevation * 3.28084)} ft)`;
    if (note.includes("Altitud:")) return;
    setNote((prev) => (prev ? `${prev}\n${altStr}` : altStr));
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImage(""); // Clear URL input to give priority to file uploads
    }
  };

  const handleRemovePhoto = () => {
    setImageFile(null);
    setImagePreview(null);
    setImage("");
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onSave({ 
      name, 
      icon, 
      note, 
      color, 
      groupId, 
      completed, 
      image: imageFile ? undefined : (image || undefined), 
      link, 
      imageFile,
      elevation: elevation !== null ? elevation : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-2xl bg-[#131b17]/95 border border-[#1b3d2b] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1b3d2b] bg-[#0c120f]">
          <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            {initialData ? "Editar Waypoint" : "Nuevo Waypoint"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 p-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-5">

            {/* ── COLUMNA IZQUIERDA ── */}
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
                  Nombre del Lugar
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ej. Cima de Monte Perdido..."
                  className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors text-sm"
                />
              </div>

              {/* Icon Selector */}
              <div className="space-y-3 border border-[#1b3d2b] p-3 rounded-2xl bg-[#0c120f]/50">
                <div className="space-y-1 shrink-0 select-none">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Filtrar por Categoría
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {WAYPOINT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-2 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-0.5 ${
                          activeCategory === cat.id
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                            : "bg-[#0b100d] border-white/5 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Selecciona el Icono
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {WAYPOINT_CATEGORIES.find((c) => c.id === activeCategory)?.icons.map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = icon === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setIcon(item.value)}
                          className={`aspect-square flex flex-col items-center justify-center p-1 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-400 text-emerald-300 font-medium"
                              : "bg-[#0a0f0d]/50 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-[#0c120f]/80"
                          }`}
                        >
                          <IconComponent className={`w-4 h-4 mb-0.5 shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                          <span className="text-[8px] leading-tight truncate w-full text-center">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
                  Notas y Descripción
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Añade detalles sobre el terreno, agua disponible, refugio, etc."
                  rows={4}
                  className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors resize-none text-sm"
                />
              </div>
            </div>

            {/* ── COLUMNA DERECHA ── */}
            <div className="space-y-4">
              {/* Color */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
                    Color
                  </label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => {
                      const isSelected = color === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          title={c.name}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 shrink-0 ${
                            isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#131b17]" : ""
                          }`}
                          style={{ backgroundColor: c.value }}
                        >
                          {isSelected && <span className="w-2 h-2 bg-white rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
                    Grupo / Reto
                  </label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 transition-colors"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-[#131b17] text-slate-100">
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Completed Checkbox */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0f0d]/50 border border-white/5">
                <input
                  type="checkbox"
                  id="wpt-completed"
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="w-4 h-4 accent-emerald-400 bg-black border-[#1b3d2b] cursor-pointer"
                />
                <label htmlFor="wpt-completed" className="text-xs font-semibold text-slate-200 cursor-pointer">
                  ¿Reto Completado? (Marcar como visitado/coronado)
                </label>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase flex items-center gap-1.5 select-none">
                  📸 Foto del Lugar
                </label>

                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden w-full h-28 border border-[#1b3d2b] bg-black/40 shadow-inner group">
                    <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label
                        htmlFor="wpt-photo-upload"
                        className="px-3 py-1.5 rounded-lg bg-emerald-400 text-black text-[10px] font-extrabold uppercase tracking-wider cursor-pointer hover:bg-emerald-300 transition-colors flex items-center gap-1"
                      >
                        <Upload className="w-3 h-3" />
                        Cambiar
                      </label>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 rounded-lg bg-red-500/80 text-white text-[10px] font-extrabold uppercase tracking-wider cursor-pointer hover:bg-red-500 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="wpt-photo-upload"
                    className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#1b3d2b] rounded-xl cursor-pointer hover:border-emerald-400 bg-[#0a0f0d]/50 hover:bg-[#0c120f]/50 transition-all text-slate-400 hover:text-slate-200 select-none group"
                  >
                    <Camera className="w-5 h-5 text-emerald-400/80 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Subir Foto</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">Desde tu ordenador</span>
                  </label>
                )}

                <input
                  type="file"
                  id="wpt-photo-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block select-none">
                    O URL de imagen
                  </span>
                  <input
                    type="url"
                    value={image}
                    onChange={(e) => {
                      setImage(e.target.value);
                      setImagePreview(e.target.value || null);
                      setImageFile(null);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              {/* Link URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase flex items-center gap-1.5">
                  🔗 Enlace de Información (URL)
                </label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Ej. https://es.wikipedia.org/... o web del refugio"
                  className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* ── FILA COMPLETA: Coordenadas ── */}
          {initialData?.lat !== undefined && initialData?.lng !== undefined && (
            <div className="mt-4 space-y-1.5 p-4 rounded-xl bg-[#0a0f0d]/50 border border-white/5 shadow-inner">
              <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase select-none">
                Ubicación y Sistemas de Coordenadas
              </label>
              <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-300 font-mono select-text">
                <div className="bg-[#050807]/40 border border-[#1b3d2b] p-2 rounded-lg">
                  <p className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wide mb-0.5">Decimal (WGS84)</p>
                  <p className="text-emerald-400 font-bold">Lat: {initialData.lat.toFixed(6)}</p>
                  <p className="text-emerald-400 font-bold">Lon: {initialData.lng.toFixed(6)}</p>
                </div>

                <div className="bg-[#050807]/40 border border-[#1b3d2b] p-2 rounded-lg">
                  <p className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wide mb-0.5">DMS (GMS)</p>
                  <p className="text-amber-400">{latLngToDms(initialData.lat, initialData.lng).lat}</p>
                  <p className="text-amber-400">{latLngToDms(initialData.lat, initialData.lng).lng}</p>
                </div>

                <div className="bg-[#050807]/40 border border-[#1b3d2b] p-2 rounded-lg">
                  <p className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wide mb-0.5">UTM ETRS89 (30N)</p>
                  <p className="text-blue-400">X: <span className="font-bold">{latLngToUtm(initialData.lat, initialData.lng, "WGS84").x.toLocaleString()}</span></p>
                  <p className="text-blue-400">Y: <span className="font-bold">{latLngToUtm(initialData.lat, initialData.lng, "WGS84").y.toLocaleString()}</span></p>
                </div>

                <div className="bg-[#050807]/40 border border-[#1b3d2b] p-2 rounded-lg">
                  <p className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wide mb-0.5">UTM ED50 (30N)</p>
                  <p className="text-rose-400">X: <span className="font-bold">{latLngToUtm(initialData.lat, initialData.lng, "ED50").x.toLocaleString()}</span></p>
                  <p className="text-rose-400">Y: <span className="font-bold">{latLngToUtm(initialData.lat, initialData.lng, "ED50").y.toLocaleString()}</span></p>
                </div>
              </div>

              {/* Altitud Estimada */}
              <div className="bg-[#050807]/60 border border-[#1b3d2b] rounded-lg p-2.5 flex items-center justify-between mt-2 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏔️</span>
                  <div>
                    <p className="text-[9px] font-sans font-bold text-slate-500 uppercase tracking-wide">Altitud Estimada</p>
                    {fetchingElevation ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-emerald-400/80 font-medium">Consultando API...</span>
                      </div>
                    ) : elevation !== null ? (
                      <p className="text-emerald-400 font-mono text-[11px] font-bold">
                        {elevation} m <span className="text-slate-400 font-normal">({Math.round(elevation * 3.28084)} ft)</span>
                      </p>
                    ) : (
                      <p className="text-rose-400 text-[10px] font-bold">No disponible</p>
                    )}
                  </div>
                </div>
                {elevation !== null && (
                  <button
                    type="button"
                    onClick={handleAppendElevationToNotes}
                    disabled={note.includes("Altitud:")}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                      note.includes("Altitud:")
                        ? "bg-[#18231e] border-[#1b3d2b] text-emerald-500/50 cursor-not-allowed"
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/40 cursor-pointer"
                    }`}
                  >
                    {note.includes("Altitud:") ? "En Notas" : "✍️ Añadir a Notas"}
                  </button>
                )}
              </div>

              <p className="text-[8px] text-slate-500 leading-normal italic select-none pt-0.5">
                💡 Nota: Las coordenadas en ED50 aplican la transformación oficial del IGN para la península ibérica (mismatch habitual de ~120m).
              </p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-[#1b3d2b] bg-[#0c120f] flex justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={async () => {
                if (await customConfirm("¿Seguro que deseas eliminar este waypoint?")) {
                  onDelete();
                  onClose();
                }
              }}
              className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-xl"
            >
              Eliminar
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors bg-[#0a0f0d]/80 border border-white/5 rounded-xl hover:bg-[#0c120f]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 text-xs font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors rounded-xl shadow-lg shadow-emerald-400/20"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
