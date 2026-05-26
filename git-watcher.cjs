const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const WATCH_DIR = __dirname;
const DEBOUNCE_MS = 5000; // Esperar 5 segundos tras el último cambio antes de hacer commit y push
const IGNORED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  '.gemini',
  '.agents',
  'package-lock.json',
];

let timeoutId = null;

console.log("\x1b[32m%s\x1b[0m", "🚀 SummitGPS Git Auto-Watcher Iniciado!");
console.log(`Vigilando directorio: ${WATCH_DIR}`);
console.log(`Debounce: ${DEBOUNCE_MS / 1000}s (espera antes del push)`);

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: WATCH_DIR }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function handleCommitAndPush() {
  console.log("\x1b[36m%s\x1b[0m", "📦 Cambios detectados. Preparando commit...");
  try {
    // 1. Verificar si hay cambios reales en git
    const { stdout: statusOut } = await runCommand('git status --porcelain');
    if (!statusOut.trim()) {
      console.log("No hay cambios pendientes de registrar.");
      return;
    }
    
    console.log("\x1b[33m%s\x1b[0m", "Añadiendo archivos (git add .)...");
    await runCommand('git add .');
    
    const commitMsg = `auto: guardado automático el ${new Date().toLocaleString()}`;
    console.log("\x1b[33m%s\x1b[0m", `Creando commit: "${commitMsg}"`);
    await runCommand(`git commit -m "${commitMsg}"`);
    
    console.log("\x1b[33m%s\x1b[0m", "Subiendo cambios a GitHub (git push origin main)...");
    await runCommand('git push origin main');
    
    console.log("\x1b[32m%s\x1b[0m", "✅ ¡Cambios subidos a GitHub con éxito!");
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "❌ Error al procesar git:", error.message || error);
  }
}

// Watch recursivo (nativo en Windows)
fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  
  // Ignorar paths no deseados
  const isIgnored = IGNORED_PATHS.some(ignored => 
    filename.includes(ignored) || filename.startsWith(ignored)
  );
  if (isIgnored) return;
  
  // Reiniciar temporizador para debounce
  if (timeoutId) clearTimeout(timeoutId);
  
  timeoutId = setTimeout(() => {
    handleCommitAndPush();
  }, DEBOUNCE_MS);
});
