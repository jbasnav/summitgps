import React, { useState } from "react";
import { supabase, isSupabaseConfigured } from "../utils/supabaseClient";
import { Mail, Lock, Loader, Compass, ShieldAlert, UserPlus, LogIn } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  onSkipAuth: () => void;
}

export function AuthScreen({ onAuthSuccess, onSkipAuth }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      {/* Dynamic blurred outdoor landscape background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-[8px] scale-105 pointer-events-none select-none"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#070a08] via-transparent to-[#070a08]/80 pointer-events-none" />

      {/* Main glassmorphic login card container */}
      <div className="relative w-full max-w-md bg-[#131b17]/90 border border-[#1b3d2b] rounded-3xl shadow-2xl p-8 backdrop-blur-md text-slate-100 flex flex-col space-y-6 animate-fade-in my-8">
        
        {/* Brand / Logo Header */}
        <div className="flex flex-col items-center text-center space-y-2 select-none">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <Compass className="w-8 h-8 text-emerald-400 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-emerald-400">
              SUMMIT GPS
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">
              Outdoor Planner SaaS
            </p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mt-1">
            Persiste tus cumbres, retos de montaña y dibuja tus rutas sincronizadas en la nube.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#0a0f0d] border border-[#1b3d2b]/40 rounded-xl relative select-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "login"
                ? "bg-emerald-400 text-black shadow-md font-bold"
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
                ? "bg-emerald-400 text-black shadow-md font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registro
          </button>
        </div>

        {/* Informative Alerts (Error / Success) */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-start gap-2 leading-relaxed">
            <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="nombre@correo.com"
                className="w-full bg-[#0a0f0d] border border-[#1b3d2b] rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                className="w-full bg-[#0a0f0d] border border-[#1b3d2b] rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-400/20 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader className="w-3.5 h-3.5 animate-spin" />
                Procesando...
              </>
            ) : activeTab === "login" ? (
              "Iniciar Sesión"
            ) : (
              "Crear Cuenta"
            )}
          </button>
        </form>

        {/* Secondary Guest Option */}
        <div className="border-t border-[#1b3d2b]/30 pt-4 flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>O continúa localmente</span>
          </div>

          <button
            type="button"
            onClick={onSkipAuth}
            disabled={loading}
            className="w-full py-2.5 border border-[#1b3d2b]/60 bg-transparent text-slate-300 hover:text-emerald-400 hover:bg-[#18231e]/20 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            👤 Continuar como Invitado (Modo Local)
          </button>
          
          {!isSupabaseConfigured && (
            <p className="text-[9px] text-amber-500/80 leading-normal text-center bg-amber-500/5 border border-amber-500/10 rounded-lg p-2 max-w-xs select-none">
              ⚠️ Supabase no está configurado en el archivo de entorno. La aplicación funcionará por defecto en modo Invitado con persistencia LocalStorage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
