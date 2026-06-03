import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";

interface Step {
  selector: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: Step[] = [
  {
    selector: ".tour-brand-header",
    title: "🏔️ Bienvenidos a SummitGPS",
    description: "Tu suite cartográfica de alto rendimiento y planificador de aventuras en la nube. ¡Exploremos los componentes clave!",
    position: "right",
  },
  {
    selector: ".tour-sidebar-tabs",
    title: "🎛️ Navegación de Funciones",
    description: "Accede al gestor de Rutas, selección de Capas y Red de Mapas, Waypoints/Marcas y Ajustes de la suite.",
    position: "bottom",
  },
  {
    selector: ".tour-map-container",
    title: "🗺️ Visor Cartográfico Interactivo",
    description: "Haz clic izquierdo para trazar rutas con auto-snap, y clic derecho para colocar Waypoints con coordenadas UTM/DMS y altitud API.",
    position: "center",
  },
  {
    selector: ".tour-elevation-profile",
    title: "📈 Perfil de Elevación Multiruta",
    description: "Compara el relieve, pendientes y desniveles acumulados de tus tracks visibles al mismo tiempo en el gráfico Recharts inferior.",
    position: "top",
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize and check localStorage
  useEffect(() => {
    const completed = localStorage.getItem("summit_onboarding_completed");
    if (completed !== "true") {
      // Delay slightly for map/sidebar initialization
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Update target bounding box reactively when step or window changes
  useEffect(() => {
    if (!isActive) return;

    const updateBoundingRect = () => {
      const step = TOUR_STEPS[currentStep];
      const element = document.querySelector(step.selector);
      if (element) {
        setRect(element.getBoundingClientRect());
      } else {
        setRect(null); // Fallback to center
      }
    };

    updateBoundingRect();
    window.addEventListener("resize", updateBoundingRect);
    window.addEventListener("scroll", updateBoundingRect);

    return () => {
      window.removeEventListener("resize", updateBoundingRect);
      window.removeEventListener("scroll", updateBoundingRect);
    };
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setIsActive(false);
    localStorage.setItem("summit_onboarding_completed", "true");
    if (onComplete) onComplete();
  };

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];

  // Inline styling for the spotlight overlay box
  const spotlightStyle: React.CSSProperties = rect
    ? {
        position: "absolute",
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        boxShadow: "0 0 0 9999px rgba(3, 7, 5, 0.75)",
        borderRadius: "16px",
        border: "2px dashed #10b981",
        pointerEvents: "none",
        zIndex: 99999,
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "1px",
        height: "1px",
        boxShadow: "0 0 0 9999px rgba(3, 7, 5, 0.8)",
        pointerEvents: "none",
        zIndex: 99999,
      };

  // Determine popover position based on target rect and step preferences
  let popoverStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 100000,
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  if (rect) {
    const margin = 16;
    if (step.position === "right") {
      popoverStyle.top = rect.top;
      popoverStyle.left = rect.right + margin;
    } else if (step.position === "left") {
      popoverStyle.top = rect.top;
      popoverStyle.left = rect.left - 340 - margin; // 340px popover width
    } else if (step.position === "bottom") {
      popoverStyle.top = rect.bottom + margin;
      popoverStyle.left = Math.max(16, rect.left + rect.width / 2 - 170);
    } else if (step.position === "top") {
      popoverStyle.top = rect.top - 180 - margin;
      popoverStyle.left = Math.max(16, rect.left + rect.width / 2 - 170);
    } else {
      // Fallback center
      popoverStyle.top = "50%";
      popoverStyle.left = "50%";
      popoverStyle.transform = "translate(-50%, -50%)";
    }
  } else {
    // Center of screen
    popoverStyle.top = "50%";
    popoverStyle.left = "50%";
    popoverStyle.transform = "translate(-50%, -50%)";
  }

  // Adjust for screen boundary overflows
  if (typeof popoverStyle.left === "number" && popoverStyle.left < 10) {
    popoverStyle.left = 10;
  }
  if (typeof popoverStyle.left === "number" && popoverStyle.left + 350 > window.innerWidth) {
    popoverStyle.left = window.innerWidth - 360;
  }
  if (typeof popoverStyle.top === "number" && popoverStyle.top + 200 > window.innerHeight) {
    popoverStyle.top = window.innerHeight - 210;
  }
  if (typeof popoverStyle.top === "number" && popoverStyle.top < 10) {
    popoverStyle.top = 10;
  }

  return (
    <div className="fixed inset-0 z-[99998] overflow-hidden select-none pointer-events-auto">
      {/* Spotlight highlight */}
      <div style={spotlightStyle} className="animate-pulse-slow">
        {rect && (
          <div className="absolute inset-0 rounded-2xl border border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-ping opacity-50" />
        )}
      </div>

      {/* Popover Bubble */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[340px] bg-[#0c120f]/90 border border-[#1b3d2b] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-5 text-slate-100 backdrop-blur-xl animate-scale-up"
      >
        {/* Glow accent */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-3 border-b border-[#1b3d2b] pb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Guía Rápida · Paso {currentStep + 1} de {TOUR_STEPS.length}</span>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-200 transition-colors p-0.5 rounded hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-100 font-sans tracking-wide">
            {step.title}
          </h4>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans">
            {step.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#1b3d2b]">
          <button
            onClick={handleClose}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-300 cursor-pointer"
          >
            Saltar
          </button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300 text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1 shadow-lg shadow-emerald-400/10 cursor-pointer"
            >
              {currentStep === TOUR_STEPS.length - 1 ? "Comenzar" : "Siguiente"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
