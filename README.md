# ⛰️ SummitGPS

**SummitGPS** es una aplicación web interactiva y avanzada de planificación y análisis de rutas de montaña, senderismo y ciclismo en 2D y 3D. Ha sido diseñada con un enfoque riguroso de seguridad en montaña y rendimiento deportivo.

La aplicación permite trazar rutas inteligentes sobre senderos reales, analizar desniveles y meteorología en cumbres, visualizar el terreno físico tridimensional en relieve real, gestionar sistemas de cuadrículas militares para rescates (UTM/MGRS), e importar datos biométricos y de rendimiento grabados por dispositivos GPS (archivos FIT).

---

## 🌟 Características Principales

* **Planificación Avanzada (2D):**
  * Trazado inteligente con imán (**Snap-to-Trail**) optimizado para senderismo, ciclismo de carretera y MTB, impulsado por **GraphHopper** y fallbacks locales a **BRouter**.
  * Herramientas completas de edición geométrica en el mapa: cortar rutas (Split), suavizado (Smooth), simplificación (algoritmo Douglas-Peucker) y borrado por caja (Clean Area).
* **Capas Especiales WMS y Rescate:**
  * Superposición en tiempo real de capas oficiales del IGN de España: Espacios Protegidos del MITECO, variantes del Camino de Santiago y la red *Spain by Bike*.
  * Cuadrículas de coordenadas geográficas en pantalla: Decimales (DD), Sexagesimales (DMS), UTM y MGRS con etiquetas de rejilla activas.
* **Seguridad y Meteorología (OpenSnow):**
  * Predicción meteorológica de cota real. Incorpora la **tasa de descenso adiabática (-0.65 °C por cada 100m)** calculada a través del modelo de elevación digital para estimar la temperatura real en cumbres.
  * Extracción automática de artículos de Wikipedia cercanos a tus marcadores.
  * Simulador dinámico del arco solar y cálculo de sombras sobre el relieve del terreno.
* **Visualización en 3D Real:**
  * Renderizado interactivo tridimensional con relieve real utilizando **MapLibre GL** y **CesiumJS** (ArcGIS World Elevation).
  * Simulador de **vuelo en primera persona** (estilo video de Relive) a lo largo del track, con factor de exageración de relieve ajustable.
* **Análisis de Rendimiento Deportivo (Archivos FIT):**
  * Parser nativo de archivos `.fit` (Garmin/Wahoo). Extrae y sincroniza en las rutas los datos biométricos de sensores: **Frecuencia Cardíaca, Potencia (W), Cadencia y Velocidad**.
  * Pintado degradado del track en el mapa basado en el esfuerzo físico.
* **Capacidades Offline PWA:**
  * Descargador automático de teselas de mapas para la ruta activa (zooms de montaña 12-15) con concurrencia optimizada.
  * Persistencia en base de datos local **IndexedDB** y Service Worker PWA para funcionamiento offline completo en montaña.

---

## 🛠️ Stack Tecnológico

* **Core:** React 19 (TypeScript), Vite 8.
* **Mapas e Interacción:** Leaflet (2D), MapLibre GL / CesiumJS (3D).
* **Base de Datos y Auth:** Supabase (PostgreSQL).
* **Diseño y Estética:** Tailwind CSS 4, Vanilla CSS (tema premium oscuro).
* **Gráficos:** Recharts.

---

## 🚀 Instalación y Desarrollo Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/jbasnav/summitgps.git
   cd summitgps
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Variables de Entorno:**
   Crea un archivo `.env.local` en la raíz del proyecto y añade tus claves de APIs:
   ```env
   # Supabase
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima-supabase

   # GraphHopper Routing API (Para Snap-to-Trail)
   VITE_GRAPHHOPPER_KEY=tu-clave-graphhopper
   ```

4. **Ejecutar servidor de desarrollo:**
   ```bash
   npm run dev
   ```

5. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📁 Documentación del Proyecto

Toda la documentación y estado del proyecto se encuentra disponible en la carpeta de documentación pública:
* **[Guía de Despliegue de Servidores](file:///C:/Users/jbast/OneDrive/Escritorio/00.CODING-CODE/PIXDEMIA/SummitGPS/public/docs/deployment_guide.md):** Instrucciones detalladas para alojar SummitGPS en Vercel/Netlify, servidores VPS con Nginx o hostings con cPanel.
* **[Manual de Usuario de la App](file:///C:/Users/jbast/OneDrive/Escritorio/00.CODING-CODE/PIXDEMIA/SummitGPS/public/docs/manual_usuario.md):** Manual completo en español sobre cómo exprimir todas las funciones del trazador y meteorología.
* **[Tablero de Estado y Backlog](file:///C:/Users/jbast/OneDrive/Escritorio/00.CODING-CODE/PIXDEMIA/SummitGPS/public/docs/project_status.md):** Estado del desarrollo actual de la app gestionado por el agente coordinador del equipo.
