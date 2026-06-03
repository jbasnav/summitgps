import { X, Check, Sparkles } from "lucide-react";

interface PlusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
}

export function PlusModal({ isOpen, onClose, onUpgradeSuccess }: PlusModalProps) {
  if (!isOpen) return null;

  const features = [
    { name: "Crear listas y añadir rutas favoritas", basic: true, plus: true },
    { name: "Usar el Navegador para mantenerte en el itinerario correcto", basic: true, plus: true },
    { name: "Descargar mapas para usar sin conexión (Offline)", basic: false, plus: true },
    { name: "Obtener las condiciones de la ruta (Tiempo e Índices)", basic: false, plus: true },
    { name: "Ver fotos del recorrido por la ruta", basic: false, plus: true },
    { name: "Recibir notificaciones cuando te desvías de la ruta", basic: false, plus: true },
    { name: "Previsualizar el itinerario y terreno en 3D", basic: false, plus: true },
    { name: "Compartir actividades en directo con amigos", basic: false, plus: true },
    { name: "Encontrar rutas filtrando por ubicación", basic: false, plus: true },
    { name: "Imprimir mapas de seguridad en alta resolución", basic: false, plus: true },
    { name: "Eliminar anuncios de la plataforma", basic: false, plus: true },
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in select-none">
      {/* Modal Card */}
      <div className="relative w-full max-w-[520px] max-h-[90vh] bg-[#0c120f]/95 border border-[#1b3d2b] rounded-3xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-md">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/40 hover:bg-[#1b3d2b]/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-full text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
              <span>SummitGPS Plus</span>
            </div>
            
            <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight leading-tight">
              Prepárate para la nieve, el barro, el hielo y mucho más
            </h2>
            
            <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
              Solo 19,99 €/año <span className="text-slate-400 text-[10px] lowercase font-normal">(es decir, 1,67 €/mes)</span>
            </p>
          </div>

          {/* Feature Comparison Table */}
          <div className="border border-[#1b3d2b]/40 rounded-2xl overflow-hidden bg-black/25">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#111c16]/80 border-b border-[#1b3d2b]/40 text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="p-3">Podrás</th>
                  <th className="p-3 text-center w-16">Basic</th>
                  <th className="p-3 text-center w-16 text-emerald-400">Plus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b3d2b]/15 text-slate-300">
                {features.map((feat, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-all">
                    <td className="p-3 font-medium leading-tight">{feat.name}</td>
                    <td className="p-3 text-center">
                      {feat.basic ? (
                        <Check className="w-3.5 h-3.5 text-slate-500 mx-auto" />
                      ) : (
                        <span className="text-slate-600 font-bold">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center bg-emerald-500/[0.02]">
                      {feat.plus ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto filter drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
                      ) : (
                        <span className="text-slate-600 font-bold">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Did You Know Banner */}
          <div className="p-4 bg-[#111c16]/50 border border-emerald-500/10 rounded-2xl flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-black font-black flex flex-col items-center justify-center shadow-lg shrink-0">
              <span className="text-[10px] leading-none uppercase font-extrabold opacity-60">Sabías</span>
              <span className="text-sm font-black tracking-tighter leading-none mt-0.5">x3</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">¿Lo sabías?</span>
              <p className="text-[10.5px] text-slate-400 leading-normal">
                Los suscriptores de <strong className="text-slate-200">SummitGPS Plus</strong> pasan el triple de tiempo en ruta explorando nuevas cumbres y senderos.
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-6 bg-[#080d0b] border-t border-[#1b3d2b]/40 flex flex-col items-center gap-3">
          <button
            onClick={onUpgradeSuccess}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-black hover:from-emerald-400 hover:to-teal-300 font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-[0.99] cursor-pointer text-center"
          >
            Continuar con Plus
          </button>
          
          <div className="flex flex-col items-center gap-1 text-[9px] text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Cancela en cualquier momento</span>
            <div className="flex gap-2">
              <a href="#" className="hover:underline hover:text-slate-400">Política de privacidad</a>
              <span>•</span>
              <a href="#" className="hover:underline hover:text-slate-400">Condiciones del servicio</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
