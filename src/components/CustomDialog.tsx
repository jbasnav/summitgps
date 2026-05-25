import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { Info, HelpCircle, FileText } from "lucide-react";

interface DialogConfig {
  isOpen: boolean;
  type: "alert" | "confirm" | "prompt";
  title: string;
  message: string;
  defaultValue?: string;
  resolve: ((value: any) => void) | null;
}

interface CustomDialogContextType {
  customAlert: (message: string, title?: string) => Promise<void>;
  customConfirm: (message: string, title?: string) => Promise<boolean>;
  customPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

const CustomDialogContext = createContext<CustomDialogContextType | undefined>(undefined);

export function useCustomDialog() {
  const context = useContext(CustomDialogContext);
  if (!context) {
    throw new Error("useCustomDialog must be used within a CustomDialogProvider");
  }
  return context;
}

export function CustomDialogProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DialogConfig>({
    isOpen: false,
    type: "alert",
    title: "",
    message: "",
    defaultValue: "",
    resolve: null,
  });

  const [promptValue, setPromptValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config.isOpen && config.type === "prompt") {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [config.isOpen, config.type]);

  const customAlert = (message: string, title: string = "Aviso") => {
    return new Promise<void>((resolve) => {
      setConfig({
        isOpen: true,
        type: "alert",
        title,
        message,
        resolve: () => {
          resolve();
        },
      });
    });
  };

  const customConfirm = (message: string, title: string = "Confirmación") => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        isOpen: true,
        type: "confirm",
        title,
        message,
        resolve: (val) => {
          resolve(!!val);
        },
      });
    });
  };

  const customPrompt = (message: string, defaultValue: string = "", title: string = "Entrada") => {
    setPromptValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setConfig({
        isOpen: true,
        type: "prompt",
        title,
        message,
        defaultValue,
        resolve: (val) => {
          resolve(val);
        },
      });
    });
  };

  const handleClose = (value: any) => {
    if (config.resolve) {
      config.resolve(value);
    }
    setConfig((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  return (
    <CustomDialogContext.Provider value={{ customAlert, customConfirm, customPrompt }}>
      {children}
      {config.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
          <div 
            className="w-full max-w-md bg-[#0c120f]/95 border border-[#1b3d2b] rounded-2xl shadow-2xl p-6 space-y-4 text-slate-100 relative overflow-hidden"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (config.type === "prompt") {
                  handleClose(promptValue);
                } else {
                  handleClose(true);
                }
              } else if (e.key === "Escape") {
                handleClose(config.type === "confirm" ? false : null);
              }
            }}
          >
            {/* Elegant top color band */}
            <div 
              className="absolute top-0 inset-x-0 h-1"
              style={{ 
                backgroundColor: config.type === "alert" ? "#10b981" : config.type === "confirm" ? "#f59e0b" : "#3b82f6" 
              }}
            />

            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl shrink-0 ${
                config.type === "alert" 
                  ? "bg-emerald-500/10 text-emerald-400" 
                  : config.type === "confirm" 
                  ? "bg-amber-500/10 text-amber-500" 
                  : "bg-blue-500/10 text-blue-400"
              }`}>
                {config.type === "alert" && <Info className="w-6 h-6" />}
                {config.type === "confirm" && <HelpCircle className="w-6 h-6" />}
                {config.type === "prompt" && <FileText className="w-6 h-6" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="text-sm font-extrabold tracking-wider text-emerald-400 uppercase">
                  {config.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {config.message}
                </p>
              </div>
            </div>

            {config.type === "prompt" && (
              <div className="mt-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  className="w-full bg-black/40 border border-[#1b3d2b] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-400 transition-colors"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {(config.type === "confirm" || config.type === "prompt") && (
                <button
                  type="button"
                  onClick={() => handleClose(config.type === "confirm" ? false : null)}
                  className="px-4 py-2 bg-[#1c2921] border border-[#1b3d2b] hover:bg-[#25372c] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                onClick={() => handleClose(config.type === "prompt" ? promptValue : true)}
                className={`px-5 py-2 text-black rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
                  config.type === "alert" 
                    ? "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-400/10" 
                    : config.type === "confirm" 
                    ? "bg-amber-500 hover:bg-amber-400 shadow-amber-500/10" 
                    : "bg-blue-400 hover:bg-blue-300 shadow-blue-400/10"
                }`}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomDialogContext.Provider>
  );
}
