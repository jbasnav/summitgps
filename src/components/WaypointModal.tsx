import React, { useState } from "react";
import { X, MapPin, Tent, Camera, AlertTriangle, Info, Droplet } from "lucide-react";

interface WaypointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; icon: string; note: string; color: string; groupId: string; completed: boolean }) => void;
  initialData?: { name: string; icon: string; note: string; color: string; groupId?: string; completed?: boolean };
  onDelete?: () => void;
  groups: any[]; // Renders available WaypointGroups
}

const ICONS = [
  { value: "mountain", label: "Pico / Montaña", icon: MapPin },
  { value: "camp", label: "Campamento", icon: Tent },
  { value: "camera", label: "Fotografía / Vistas", icon: Camera },
  { value: "danger", label: "Alerta / Peligro", icon: AlertTriangle },
  { value: "info", label: "Información", icon: Info },
  { value: "water", label: "Agua / Fuente", icon: Droplet },
];

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
  const [name, setName] = useState(initialData?.name || "");
  const [icon, setIcon] = useState(initialData?.icon || "mountain");
  const [note, setNote] = useState(initialData?.note || "");
  const [color, setColor] = useState(initialData?.color || "#10b981");
  const [groupId, setGroupId] = useState(initialData?.groupId || "default");
  const [completed, setCompleted] = useState(initialData?.completed || false);

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || "");
      setIcon(initialData?.icon || "mountain");
      setNote(initialData?.note || "");
      setColor(initialData?.color || "#10b981");
      setGroupId(initialData?.groupId || "default");
      setCompleted(initialData?.completed || false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, icon, note, color, groupId, completed });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-md bg-[#131b17]/95 border border-[#1b3d2b] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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
              placeholder="Ej. Cima de Monte Perdido, Campamento base..."
              className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
              Categoría e Icono
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setIcon(item.value)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-400 text-emerald-300 font-medium"
                        : "bg-[#0a0f0d]/50 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-[#0c120f]/80"
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 mb-1 ${isSelected ? "text-emerald-400" : "text-slate-400"}`} />
                    <span className="text-[10px] leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
              Color del Marcador
            </label>
            <div className="flex gap-3">
              {COLORS.map((c) => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                      isSelected ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#131b17]" : ""
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group / Challenge Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
              Grupo / Reto Asociado
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#131b17] text-slate-100">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Completed Checkbox */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0a0f0d]/50 border border-white/5">
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

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-400/80 tracking-wider uppercase">
              Notas y Descripción
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Añade detalles sobre el terreno, agua disponible, refugio, etc."
              rows={3}
              className="w-full bg-[#0a0f0d]/80 border border-[#1b3d2b] rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-[#1b3d2b] bg-[#0c120f] flex justify-between gap-3">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Seguro que deseas eliminar este waypoint?")) {
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
              type="submit"
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
