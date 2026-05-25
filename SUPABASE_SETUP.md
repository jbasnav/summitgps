# ⚡ Guía de Configuración de Supabase para SUMMIT GPS

Esta guía te guiará paso a paso para configurar tu base de datos, almacenamiento de archivos y autenticación en **Supabase** para habilitar la sincronización en la nube multiusuario.

---

## 🚀 Paso 1: Crear un Proyecto en Supabase

1. Ve a [Supabase](https://supabase.com/) e inicia sesión.
2. Haz clic en **New Project** (Nuevo proyecto).
3. Selecciona tu organización, dale un nombre (ej. `SUMMIT GPS`), define una contraseña segura para la base de datos y elige la región más cercana a ti.
4. Haz clic en **Create new project** y espera un par de minutos a que se inicialice.

---

## 📊 Paso 2: Crear las Tablas y Políticas de Seguridad (RLS)

1. En el panel izquierdo de Supabase, haz clic en **SQL Editor** (Editor SQL).
2. Haz clic en **New Query** (Nueva consulta).
3. Copia y pega el siguiente script SQL completo. Este script crea las tablas de **retos (grupos)**, **rutas (tracks)** y **marcas (waypoints)**, habilita la seguridad de fila (RLS) y crea las políticas para aislar los datos de cada usuario:

```sql
-- =========================================================
-- 1. TABLA DE GRUPOS DE WAYPOINTS / RETOS
-- =========================================================
CREATE TABLE IF NOT EXISTS waypoint_groups (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    visible BOOLEAN DEFAULT TRUE,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================
-- 2. TABLA DE TRACKS / RUTAS
-- =========================================================
CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points JSONB NOT NULL DEFAULT '[]'::jsonb,
    visible BOOLEAN DEFAULT TRUE,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================
-- 3. TABLA DE WAYPOINTS / MARCAS
-- =========================================================
CREATE TABLE IF NOT EXISTS waypoints (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    icon TEXT NOT NULL,
    note TEXT,
    color TEXT NOT NULL,
    group_id TEXT REFERENCES waypoint_groups(id) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT FALSE,
    image TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================
-- 4. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
-- =========================================================
ALTER TABLE waypoint_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE waypoints ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. CREACIÓN DE POLÍTICAS RLS (AISLAMIENTO DE USUARIOS)
-- =========================================================

-- Políticas para waypoint_groups (Retos)
CREATE POLICY "Usuarios pueden ver sus propios grupos" ON waypoint_groups
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios grupos" ON waypoint_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios grupos" ON waypoint_groups
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden borrar sus propios grupos" ON waypoint_groups
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para tracks (Rutas)
CREATE POLICY "Usuarios pueden ver sus propios tracks" ON tracks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios tracks" ON tracks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios tracks" ON tracks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden borrar sus propios tracks" ON tracks
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para waypoints (Marcas)
CREATE POLICY "Usuarios pueden ver sus propios waypoints" ON waypoints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios waypoints" ON waypoints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propios waypoints" ON waypoints
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden borrar sus propios waypoints" ON waypoints
    FOR DELETE USING (auth.uid() = user_id);
```

4. Haz clic en **Run** (Ejecutar) en la esquina superior derecha del editor. Deberías ver un mensaje indicando que la consulta se ejecutó con éxito.

---

## 🪣 Paso 3: Configurar el Almacenamiento de Fotos (Storage)

Para habilitar la subida de fotos locales desde el ordenador al crear/editar hitos, debes configurar un Bucket público:

1. En el panel izquierdo de Supabase, ve a **Storage** (Almacenamiento).
2. Haz clic en **New Bucket** (Nuevo bucket).
3. Configura las siguientes opciones:
   * **Name of the bucket:** `waypoint-photos` *(Debe ser exactamente este nombre en minúsculas)*.
   * **Public bucket:** Activa esta opción (debe estar en **público** para que las fotos puedan renderizarse satinadas en tu mapa y sidebar).
4. Haz clic en **Save** (Guardar).
5. **Políticas de subida para el Storage:**
   * En la configuración del bucket `waypoint-photos`, haz clic en **Policies** (Políticas) en el panel lateral.
   * En la sección *Other policies*, haz clic en **New Policy** (Nueva política) para permitir la subida.
   * Selecciona **Allowed Operations**: Marca únicamente **INSERT** y **SELECT**.
   * En *Target folders* o en la condición SQL, puedes definir que los usuarios autenticados puedan subir archivos. La política por defecto de Supabase "Allow authenticated uploads" es excelente:
     ```sql
     -- Condición simple para permitir inserción a usuarios autenticados
     auth.role() = 'authenticated'
     ```
   * Haz clic en **Save**.

---

## 🔑 Paso 4: Enlazar tu Aplicación SUMMIT GPS (.env.local)

1. En el panel izquierdo de Supabase, ve a **Project Settings** (Ajustes de proyecto, icono de engranaje) y haz clic en **API**.
2. Copia los siguientes valores:
   * **Project API keys -> anon (public):** Esta es tu clave anónima pública (`VITE_SUPABASE_ANON_KEY`).
   * **Project URL:** Esta es la URL de tu proyecto (`VITE_SUPABASE_URL`).
3. Abre tu proyecto en VS Code u otro editor y crea un archivo llamado `.env.local` en la raíz del proyecto (`C:\Users\jbasterrika\Desktop\CODING\PIXDEMIA\SUMMIT\.env.local`).
4. Pega el siguiente contenido reemplazando con tus valores reales:

```env
VITE_SUPABASE_URL=https://tu-proyecto-id.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica-copiada-de-supabase
```

5. **Reinicia tu servidor de desarrollo:**
   Si tu terminal estaba corriendo `npm run dev`, ciérralo (`Ctrl+C`) e inicialo de nuevo para que Vite cargue las nuevas variables de entorno:
   ```bash
   npm run dev
   ```

---

## 👤 Paso 5: ¡Listo para el Login!

¡Felicidades! Al arrancar la aplicación, ahora detectará las llaves de Supabase y te recibirá con la espectacular pantalla **glassmorphic** de Inicio de Sesión.
* Puedes registrarte introduciendo tu correo y contraseña.
* Una vez registrado, podrás gestionar retos en la nube, dibujar rutas sin perderlas al limpiar cookies, y subir fotos locales arrastrándolas al modal de marcas.
