import React, { useState } from "react";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";
import { Mail, Lock, Loader, Compass, ShieldAlert, UserPlus, LogIn, Eye, EyeOff, Map, TrendingUp, Cloud } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  onSkipAuth: () => void;
}

export function AuthScreen({ onAuthSuccess, onSkipAuth }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase no está configurado. Por favor, define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.local"
        );
      }

      if (activeTab === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        if (data.user) {
          onAuthSuccess(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
        if (error) throw error;
        
        // Check if user is auto-confirmed or needs email validation
        if (data.user && data.session) {
          onAuthSuccess(data.user);
        } else {
          setSuccessMsg("¡Registro completado! Por favor, revisa tu correo electrónico para confirmar tu cuenta.");
          setEmail("");
          setPassword("");
        }
      }
    } catch (err: any) {
      console.error("Auth operation failed:", err);
      setErrorMsg(err.message || "Ocurrió un error inesperado al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#070a08] p-4 overflow-y-auto">
      {/* Background blurred outdoor landscape image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-[8px] scale-105 pointer-events-none select-none"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#070a08] via-[#070a08]/80 to-[#070a08]/90 pointer-events-none" />

      {/* Main glassmorphic login card container - 2 columns layout */}
      <div className="relative w-full max-w-4xl bg-[#131b17]/85 border border-[#1b3d2b]/40 rounded-3xl shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col md:grid md:grid-cols-12 overflow-hidden animate-fade-in my-8 glass-panel-glow">
        
        {/* Left Column: Brand Feature Highlights Panel (hidden on mobile) */}
        <div className="col-span-5 hidden md:flex flex-col justify-between p-10 relative overflow-hidden border-r border-[#1b3d2b]/20 bg-[#0a0f0d]/40">
          {/* Glowing aura effect */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486873249359-2731bd6dafc7?auto=format&fit=crop&w=600&q=80')] bg-cover bg-center opacity-5 mix-blend-overlay pointer-events-none" />
          
          {/* Logo & Header */}
          <div className="flex items-center gap-3 z-10 select-none">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#1b3d2b]/60 flex items-center justify-center bg-[#131b17]/90 shadow-md">
              <Compass className="w-5.5 h-5.5 text-emerald-400 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wider text-emerald-400">SUMMIT GPS</h2>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Outdoor Planner SaaS</p>
            </div>
          </div>

          {/* Core Feature Highlights */}
          <div className="space-y-6 my-auto z-10 pr-2">
            <h3 className="text-lg font-bold leading-snug text-slate-200">
              Planifica tu próxima <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">aventura en la montaña</span> con total precisión
            </h3>
            
            <div className="space-y-4">
              {/* Feature 1 */}
              <div className="flex gap-3 p-2.5 rounded-xl hover:bg-emerald-500/5 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40">
                  <Map className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 group-hover:text-emerald-300 transition-colors">Rutas a Pie Inteligentes</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Dibuja tus tracks con auto-trazado topográfico en senderos de montaña.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex gap-3 p-2.5 rounded-xl hover:bg-emerald-500/5 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 group-hover:text-emerald-300 transition-colors">Perfil de Elevación Activo</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Analiza desniveles acumulados y altitudes al instante mientras trazas.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex gap-3 p-2.5 rounded-xl hover:bg-emerald-500/5 transition-all group">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300 group-hover:text-emerald-300 transition-colors">Sincronización en la Nube</h4>
                  <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Guarda tus hitos y mapas. Sincronízalos para no perder nada.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Rights */}
          <div className="text-[9px] text-slate-500 z-10 select-none">
            © {new Date().getFullYear()} SummitGPS. Creado para montañeros.
          </div>
        </div>

        {/* Right Column: Authentication Form Panel */}
        <div className="col-span-7 p-8 md:p-10 flex flex-col justify-center space-y-6 bg-[#0a0f0d]/30">
          
          {/* Logo only visible on mobile screens */}
          <div className="flex md:hidden flex-col items-center text-center space-y-2 select-none mb-2">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#1b3d2b]/60 flex items-center justify-center shadow-lg bg-[#131b17]/95">
              <Compass className="w-6.5 h-6.5 text-emerald-400 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wider text-emerald-400">SUMMIT GPS</h2>
              <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Outdoor Planner SaaS</p>
            </div>
          </div>

          {/* Header Title for Current State */}
          <div className="space-y-1 select-none">
            <h3 className="text-lg font-bold text-slate-200">
              {activeTab === "login" ? "Bienvenido de nuevo" : "Comienza tu viaje en SummitGPS"}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTab === "login" 
                ? "Inicia sesión para sincronizar tus tracks, hitos y retos en la nube."
                : "Crea tu cuenta de explorador y empieza a planificar tus retos de montaña."}
            </p>
          </div>

          {/* Elegant Modern Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#070a08]/90 border border-[#1b3d2b]/30 rounded-xl relative select-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "login"
                  ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/10 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Acceso
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "signup"
                  ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/10 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registro
            </button>
          </div>

          {/* Animated Alerts (Error / Success) */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-start gap-2 leading-relaxed animate-slide-up">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-start gap-2 leading-relaxed animate-slide-up">
              <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="nombre@correo.com"
                  className="w-full bg-[#0a0f0d] border border-[#1b3d2b]/60 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center select-none">
                <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                  Contraseña
                </label>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full bg-[#0a0f0d] border border-[#1b3d2b]/60 rounded-xl pl-10 pr-10 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 transition-all"
                />
                
                {/* Password Show / Hide toggler */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 rounded-md text-slate-500 hover:text-slate-300 focus:outline-none cursor-pointer hover:bg-emerald-500/5 transition-colors"
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-400/20 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99] mt-2"
            >
              {loading ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  Procesando...
                </>
              ) : activeTab === "login" ? (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Crear Cuenta de Explorador
                </>
              )}
            </button>
          </form>

          {/* Guest Option & Information */}
          <div className="border-t border-[#1b3d2b]/20 pt-6 flex flex-col items-center space-y-4">
            <div className="flex items-center gap-2 text-[9.5px] text-slate-500 font-bold uppercase tracking-wider select-none">
              <span>O continúa sin cuenta</span>
            </div>

            <button
              type="button"
              onClick={onSkipAuth}
              disabled={loading}
              className="w-full py-2.5 border border-[#1b3d2b]/60 bg-transparent text-slate-300 hover:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
            >
              <span>👤 Continuar como Invitado (Modo Local)</span>
              <span className="text-[10px] text-slate-500 group-hover:text-emerald-300 transition-colors">→</span>
            </button>
            
            {!isSupabaseConfigured && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-2.5 items-start text-left max-w-md select-none animate-slide-up">
                <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <p className="text-[10px] font-bold text-amber-500 leading-normal">
                    Servicio en la nube no enlazado
                  </p>
                  <p className="text-[9px] text-amber-500/70 leading-normal mt-0.5">
                    No se ha detectado el archivo de configuración `.env.local` con las variables de Supabase. Puedes diseñar y guardar rutas de forma local en este navegador, pero no se guardarán en la nube.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
