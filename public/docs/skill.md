# SummitGPS — Skill File

## Descripción del Proyecto
SummitGPS es una aplicación web de planificación y navegación de rutas outdoor premium, inspirada en Gaia GPS.
Construida con React + TypeScript + Vite + Leaflet + Supabase.

## Arquitectura
- `src/App.tsx` — Componente raíz y estado global de la aplicación (autenticación, meteo, búsqueda, coordinación).
- `src/hooks/useRoutePlanner.ts` — Hook central de gestión de estado: tracks, waypoints, grupos, CRUD, Supabase sync.
- `src/components/MapContainer.tsx` — Renderizado Leaflet: capas, cuadrículas, dibujo de rutas, POIs, waypoints.
- `src/components/Sidebar.tsx` — Panel lateral: biblioteca, configuración de capas, herramientas de ruta, estadísticas.
- `src/components/ElevationProfile.tsx` — Gráfico de perfil de elevación con hover sincronizado al mapa.
- `src/components/LayerSelector.tsx` — Selector de capas base y overlays del mapa.
- `src/components/WaypointModal.tsx` — Modal de creación/edición de waypoints con iconos, fotos, notas.
- `src/components/AuthScreen.tsx` — Pantalla de login/registro con Supabase Auth.
- `src/components/CustomDialog.tsx` — Sistema de diálogos personalizados (reemplazo de alert/confirm nativo).
- `src/utils/geoUtils.ts` — Funciones geodésicas: Haversine, formato de coordenadas, UTM, MGRS.
- `src/utils/gpxExporter.ts` — Exportación de tracks y waypoints a formato GPX.
- `src/utils/supabaseClient.ts` — Cliente Supabase configurado.

## Convenciones
- Idioma de la interfaz: **Español**.
- Tema visual: **Oscuro premium** con paleta esmeralda (#10b981) sobre fondos #070a08 / #0c1218.
- Persistencia dual: **LocalStorage** (modo invitado) + **Supabase** (modo autenticado).
- Enrutamiento de senderos: **Brouter** (primario) con **OSRM** (fallback).
- Elevaciones: API **Open-Meteo** (`/v1/elevation`).
- Geocodificación: **Nominatim** (OpenStreetMap).
- Meteorología: API **Open-Meteo** (`/v1/forecast`).

## Roadmap Activo
Ver `ROADMAP.md` en la raíz del proyecto para la lista completa de características pendientes vs Gaia GPS.
