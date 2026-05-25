# 🗺️ SummitGPS — Roadmap de Características (Gaia GPS Reference)

Este documento rastrea la paridad de características entre **SummitGPS** y **Gaia GPS (gaiagps.com)**.
Marcar con `[x]` cuando la característica esté completamente implementada.

---

## Matriz de Características

### 🧭 Planificación y Rutas

- [x] Dibujo de rutas punto a punto en el mapa
- [x] Snap-to-trail (ajustar a sendero) con Brouter/OSRM
- [x] Selector de Modos de Enrutamiento (Senderismo, Ciclismo, Vehículo, Línea Recta)
- [x] Deshacer último punto de la ruta
- [x] Borrar ruta completa
- [x] Dividir ruta en dos (Split Track)
- [x] Fusionar múltiples rutas (Merge Tracks)
- [ ] Recortar inicio/fin de ruta (Trim/Crop Track)
- [ ] Invertir dirección de la ruta (Reverse Track)
- [ ] Dibujo y Medición de Áreas / Polígonos (área en ha, perímetro en km)
- [ ] Proyección de Waypoints (crear WPT a distancia + rumbo desde otro punto)

### 📍 Waypoints y Marcadores

- [x] Crear waypoints con clic derecho en mapa
- [x] Editar nombre, icono, nota, color de waypoints
- [x] Fotos y enlaces en waypoints (con Supabase Storage)
- [x] Grupos/Retos de waypoints con imagen de portada
- [x] Marcar waypoints como completados (challenges)
- [x] Crear waypoint por coordenadas directas en el buscador (DD, UTM, MGRS, DMS)
- [ ] Biblioteca de iconos ampliada (+100 iconos outdoor/deportivos)
- [ ] Waypoints con altitud automática pre-rellenada

### 🗂️ Biblioteca y Organización

- [x] Biblioteca de rutas multi-track
- [x] Visibilidad individual por track (ojo)
- [x] Cambiar color de track
- [x] Grupos/Carpetas de waypoints
- [ ] Carpetas unificadas (contienen Tracks + Waypoints + Áreas)
- [ ] Buscador interno de elementos guardados (tracks/waypoints)
- [ ] Exportación en lote de toda una carpeta a GPX

### 🗺️ Capas y Mapas

- [x] Selector de capas base (OSM, Satélite, Topo España, etc.)
- [x] Cuadrículas de coordenadas (UTM, MGRS, Lat/Lng, DMS)
- [x] Etiquetas de cuadrícula con texto legible
- [x] Contornos de elevación (overlay)
- [x] Opacidad de overlay configurable
- [ ] Capas de usuario personalizadas (servidores XYZ/WMS)
- [ ] Capa de Sombreado de Pendientes (Slope Angle Shading)
- [ ] Radar de lluvia en vivo superpuesto
- [ ] Capa de tierras públicas / cotos

### 📊 Estadísticas y Análisis

- [x] Perfil de elevación interactivo sincronizado con el mapa
- [x] Distancia total, ascenso y descenso acumulados
- [x] Panel de estadísticas del track activo
- [ ] Tabla de Splits (ritmo y desnivel por km)
- [ ] Tiempo estimado de recorrido según perfil de actividad

### 🌤️ Información del Terreno

- [x] Información meteorológica al hacer clic en el mapa (actual + noche + 7 días)
- [x] Elevación del punto clickado
- [x] Geocodificación inversa (dirección del punto)
- [x] Amanecer y atardecer
- [ ] Datos de nieve / avalanchas (integración con servicios especializados)

### 📥 Importación y Exportación

- [x] Importar archivos GPX
- [x] Importar archivos JSON personalizados
- [x] Exportar a GPX
- [ ] Importar KML / KMZ (Google Earth)
- [ ] Importar GeoJSON
- [ ] Exportar a KML
- [ ] Exportar a GeoJSON

### 🖨️ Impresión

- [ ] Herramienta de Impresión de Mapa con escala cartográfica
- [ ] Caja de selección interactiva del área a imprimir
- [ ] Configuración de papel (A4/Carta) y orientación
- [ ] Estilo CSS limpio para `@media print`

### 🔍 Búsqueda

- [x] Buscador de lugares por nombre (Nominatim)
- [x] Búsqueda por coordenadas directas (DD, UTM, MGRS, DMS)
- [ ] Búsqueda y exploración de tracks públicos de la comunidad

### 🔐 Cuenta y Sincronización

- [x] Pantalla de Login / Auth con Supabase
- [x] Sincronización en la nube de tracks, waypoints y grupos
- [x] Modo invitado con LocalStorage
- [ ] Perfil de usuario con avatar y preferencias

### 🎨 Interfaz y UX

- [x] Sidebar colapsable con diseño premium
- [x] Tema oscuro profesional
- [x] Animaciones y micro-interacciones
- [x] Diseño responsive
- [ ] Atajos de teclado (K para dibujar, Escape para cancelar, etc.)
- [ ] Tutorial interactivo / onboarding para nuevos usuarios

---

## Prioridades de Desarrollo Actuales

1. **✅ Fase 1:** ~~Selector de Modos de Enrutamiento (Hike/Cycle/Drive/Straight)~~ — COMPLETADA
2. **✅ Fase 1b:** ~~Búsqueda por Coordenadas en Buscador~~ — COMPLETADA
3. **🖨️ Fase 2:** Herramienta de Impresión Cartográfica
4. **📐 Fase 3:** Dibujo y Medición de Áreas (Polígonos)
5. **📁 Fase 4:** Carpetas Unificadas y Buscador de Biblioteca
6. **📥 Fase 5:** Soporte KML/GeoJSON
