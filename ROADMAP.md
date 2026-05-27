# 🗺️ SummitGPS — Roadmap de Características

Este documento organiza y rastrea la paridad de características entre **SummitGPS** y los dos grandes referentes del sector:
1. **Gaia GPS**: Enfocado en la navegación en el terreno, capas cartográficas avanzadas, waypoints offline y gestión de carpetas de campo.
2. **gpx.studio**: Enfocado en la edición precisa, manipulación de archivos GPX, limpieza de tracks, visualización de datos temporales y soporte multiformato.

Las características se dividen en **Propiedades Comunes (Core)**, **Específicas de Gaia GPS** y **Específicas de gpx.studio**.

Marcar con `[x]` cuando la característica esté completamente implementada.

---

## Matriz de Características

### 🧭 Planificación y Rutas

#### 📌 Propiedades Comunes (Core)
- [x] Dibujo de rutas punto a punto en el mapa
- [x] Snap-to-trail (ajustar a sendero) con Brouter/OSRM
- [x] Selector de Modos de Enrutamiento (Senderismo, Ciclismo, Vehículo, Línea Recta)
- [x] Deshacer último punto de la ruta
- [x] Borrar ruta completa
- [x] Invertir dirección de la ruta (Reverse Track)

#### ⛰️ Inspiradas en Gaia GPS (Navegación y Terreno)
- [x] Dibujo y Medición de Áreas / Polígonos (área en ha, perímetro en km)
- [ ] Proyección de Waypoints (crear WPT a distancia + rumbo desde otro punto)

#### 💻 Inspiradas en gpx.studio (Edición y Geometría)
- [x] Dividir ruta en dos (Split Track)
- [x] Fusionar múltiples rutas (Merge Tracks)
- [x] Recortar inicio/fin de ruta (Trim/Crop Track)
- [x] Volver al inicio / Ida y Vuelta (Back to Start / Round Trip)
- [x] Arrastrar puntos de anclaje para reajustar segmentos
- [x] Insertar puntos intermedios entre puntos existentes

---

### ✂️ Herramientas de Limpieza y Procesado
*(Herramientas de edición fina típicamente asociadas a gpx.studio)*

#### 💻 Inspiradas en gpx.studio (Edición y Limpieza)
- [x] Reducción de puntos GPS (Minify/Simplify) manteniendo la forma del track
- [x] Selección por rectángulo para eliminar puntos dentro/fuera de un área (Clean tool)
- [ ] Eliminar puntos duplicados / outliers (picos GPS erráticos)
- [ ] Suavizado de trazado GPS (smooth track)

---

### 📍 Waypoints y Marcadores

#### 📌 Propiedades Comunes (Core)
- [x] Crear waypoints con clic derecho en mapa
- [x] Editar nombre, icono, nota y color de los waypoints
- [x] Biblioteca de iconos ampliada (+100 iconos outdoor y deportivos)

#### ⛰️ Inspiradas en Gaia GPS (Trabajo de Campo)
- [x] Asignar fotos y enlaces web a waypoints (con Supabase Storage)
- [x] Grupos/Retos de waypoints con imagen de portada
- [x] Marcar waypoints como completados (challenges en mapa)
- [x] Crear waypoint por coordenadas directas en el buscador (DD, UTM, MGRS, DMS)
- [x] Waypoints con altitud automática pre-rellenada al crearse

#### 💻 Inspiradas en gpx.studio (Interactividad en GPX)
- [x] Mover waypoints existentes arrastrándolos directamente en el mapa
- [ ] Iconos personalizados para waypoints (soporte para subida de custom SVG)

---

### 🗂️ Biblioteca y Organización

#### 📌 Propiedades Comunes (Core)
- [x] Biblioteca de rutas multi-track
- [x] Visibilidad individual por track (ojo toggle)
- [x] Cambiar color individual de cada track
- [x] Buscador interno de elementos guardados (tracks/waypoints)

#### ⛰️ Inspiradas en Gaia GPS (Gestión de Campo)
- [x] Grupos/Carpetas de waypoints
- [x] Carpetas unificadas (contienen simultáneamente Tracks + Waypoints + Áreas)

#### 💻 Inspiradas en gpx.studio (Edición Multitarea)
- [ ] Exportación en lote de toda una carpeta o grupo a un único archivo GPX

---

### 🗺️ Capas y Mapas

#### 📌 Propiedades Comunes (Core)
- [x] Selector de capas base (OSM, Satélite, Topo España, etc.)
- [ ] Capas de usuario personalizadas (soporte para servidores XYZ/WMS del usuario)

#### ⛰️ Inspiradas en Gaia GPS (Información Cartográfica Avanzada)
- [x] Cuadrículas de coordenadas superpuestas (UTM, MGRS, Lat/Lng, DMS)
- [x] Etiquetas de cuadrícula flotantes con texto legible y dinámico
- [x] Contornos de elevación e isolíneas (overlay topográfico)
- [x] Opacidad de overlay topográfico configurable por slider
- [ ] Capa de Sombreado de Pendientes (Slope Angle Shading para avalanchas)
- [ ] Capa de tierras públicas / cotos forestales

#### 💻 Inspiradas en gpx.studio (Contexto Virtual)
- [ ] Radar de lluvia en vivo superpuesto en tiempo real
- [ ] Vista a pie de calle: integración con Mapillary (imágenes libres)
- [x] Vista a pie de calle: integración con Google Street View

---

### 📊 Estadísticas y Análisis

#### 📌 Propiedades Comunes (Core)
- [x] Perfil de elevación interactivo sincronizado con cursor en mapa
- [x] Distancia total, ascenso y descenso acumulados
- [x] Panel de estadísticas flotante del track activo

#### ⛰️ Inspiradas en Gaia GPS (Rendimiento de Ruta)
- [ ] Tiempo estimado de recorrido según perfil de actividad (fórmula de Naismith/tobler)

#### 💻 Inspiradas en gpx.studio (Análisis Geométrico)
- [x] Tabla de Splits detallada (ritmo, velocidad y desnivel por kilómetro)
- [x] Colorear track en el mapa según variables (velocidad, pendiente, elevación, etc.)
- [x] Selección de un segmento específico arrastrando sobre el perfil de elevación
- [x] Estadísticas detalladas de tipo de superficie (asfalto, tierra, grava, etc.)

---

### 🌤️ Información del Terreno

#### 📌 Propiedades Comunes (Core)
- [x] Información meteorológica al hacer clic en el mapa (actual + noche + pronóstico 7 días)
- [x] Consulta de elevación del punto clickado en mapa
- [x] Geocodificación inversa (obtener dirección postal/lugar del punto)
- [x] Hora exacta de amanecer y atardecer del punto seleccionado

#### ⛰️ Inspiradas en Gaia GPS (Seguridad de Montaña)
- [ ] Datos de nieve / peligro de avalanchas (integración con boletines especializados)

#### 💻 Inspiradas en gpx.studio (Corrección de GPX)
- [ ] Solicitar datos de elevación desde MapTiler/servidor para tracks importados sin elevación

---

### 📥 Importación y Exportación

#### 📌 Propiedades Comunes (Core)
- [x] Importar archivos GPX locales
- [x] Exportar tracks y rutas a GPX estándar
- [x] Importar archivos KML / KMZ (Google Earth)
- [ ] Exportar tracks y puntos a KML

#### 💻 Inspiradas en gpx.studio (Compatibilidad de Formatos)
- [x] Importar archivos JSON de SummitGPS
- [x] Importar GeoJSON
- [x] Importar FIT (Garmin) para análisis de entrenamiento
- [ ] Exportar a GeoJSON
- [ ] Exportar seleccionando campos específicos (conservar/eliminar tiempo, HR, cadencia, etc.)
- [ ] Exportar y guardar directamente a la nube (Google Drive, Dropbox)
- [ ] Arrastrar y soltar archivos (drag & drop) directamente en el mapa para importar

---

### 🖨️ Impresión
*(Herramientas dedicadas de impresión cartográfica)*

#### 📌 Propiedades Comunes (Core)
- [x] Herramienta de Impresión de Mapa con escala cartográfica precisa
- [x] Caja de selección interactiva (rectángulo de encuadre) en el mapa del área a imprimir
- [x] Configuración de papel (A4/Carta) y orientación (Horizontal/Vertical)
- [x] Estilo CSS limpio y optimizado para `@media print` (escondiendo UI innecesaria)

---

### 🔍 Búsqueda

#### 📌 Propiedades Comunes (Core)
- [x] Buscador de lugares por nombre (Nominatim)
- [x] Búsqueda por coordenadas directas (DD, UTM, MGRS, DMS)

#### ⛰️ Inspiradas en Gaia GPS (Comunidad)
- [ ] Búsqueda y exploración de tracks públicos y rutas compartidas por la comunidad

---

### 🔐 Cuenta y Sincronización

#### 📌 Propiedades Comunes (Core)
- [x] Pantalla de Login / Autenticación con Supabase (Email/Google)
- [x] Sincronización en la nube en tiempo real de tracks, waypoints y grupos
- [x] Modo invitado offline con persistencia en LocalStorage

#### ⛰️ Inspiradas en Gaia GPS (Comunidad)
- [ ] Perfil de usuario público/privado con avatar y preferencias de actividad

---

### 🎨 Interfaz y UX

#### 📌 Propiedades Comunes (Core)
- [x] Sidebar colapsable con diseño premium de baja densidad de luz
- [x] Tema oscuro profesional outdoor-focused
- [x] Animaciones fluidas y micro-interacciones en UI
- [x] Diseño responsivo (adaptado a tablets y móviles)
- [x] Atajos de teclado rápidos (K para dibujar, Escape para cancelar, etc.)
- [ ] Tutorial interactivo guiado / onboarding de inicio rápido para nuevos usuarios

#### 💻 Inspiradas en gpx.studio (Edición Avanzada)
- [ ] Soporte para múltiples archivos/rutas abiertas simultáneamente, diferenciadas por colores
- [x] Sistema global de Deshacer / Rehacer (Ctrl+Z / Ctrl+Y) para todas las operaciones en mapa

---

### ⏱️ Datos Temporales y Actividad
*(Campos típicos de tracks grabados con GPS/gpx.studio)*

#### 💻 Inspiradas en gpx.studio (Edición Temporal)
- [ ] Editar y ajustar marcas de tiempo (timestamps) de un GPX (añadir velocidad virtual, desfasar hora)
- [ ] Cálculo dinámico de velocidad y ritmo por segmento de track
- [ ] Lectura y renderizado de sensores: frecuencia cardíaca (HR), cadencia, potencia y temperatura

---

## Prioridades de Desarrollo Actuales

1. **✅ Fase 1:** ~~Selector de Modos de Enrutamiento (Hike/Cycle/Drive/Straight)~~ — COMPLETADA
2. **✅ Fase 1b:** ~~Búsqueda por Coordenadas en Buscador~~ — COMPLETADA
3. **✅ Fase 2:** ~~Inversión de Ruta y Dibujo de Áreas (Polígonos)~~ — COMPLETADA
4. **✅ Fase 3:** ~~Herramienta de Impresión Cartográfica~~ — COMPLETADA
5. **✅ Fase 4:** ~~Carpetas Unificadas y Buscador de Biblioteca~~ — COMPLETADA
6. **✅ Fase 5:** ~~Waypoints Interactivos y Marcadores Avanzados~~ — COMPLETADA
7. **✅ Fase 6:** ~~Edición y Geometría de Rutas Avanzada~~ — COMPLETADA
8. **✅ Fase 7:** ~~Soporte KML/GeoJSON/FIT~~ — COMPLETADA
9. **✅ Fase 8:** ~~Herramientas de Limpieza (Simplify, Clean Rectangle)~~ — COMPLETADA
10. **✅ Fase 9:** ~~Estadísticas Avanzadas (Splits, coloreado por variable, superficie)~~ — COMPLETADA
11. **✅ Fase 11:** ~~Atajos de Teclado y Undo/Redo Global~~ — COMPLETADA
12. **✅ Fase 10:** ~~Street View (Mapillary/Google) e Imágenes a Pie de Calle~~ — COMPLETADA
13. **✅ Fase 12:** ~~Waypoints Avanzados con Altitud Automática y Biblioteca de +100 Iconos~~ — COMPLETADA
14. **📍 Fase 13 (Actual):** Capas Personalizadas (XYZ/WMS) y Capa de Sombreado de Pendientes (Slope Angle Shading)
15. **✅ Fase 14:** ~~Herramientas de Edición Fina (Trim, Round-Trip, Arrastre de Vértices y Waypoints)~~ — COMPLETADA
16. **⏳ Fase 15:** Limpieza Avanzada (Outliers, Suavizado y Elevación Online de GPX)
17. **⏳ Fase 16:** Exportaciones Avanzadas (KML/GeoJSON, Exportación en Lote, Cloud Storage y Drag & Drop)
