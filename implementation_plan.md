# Plan de Implementación: Relieve 3D Real (MapLibre) y Capas Públicas de Seguridad y Senderos

Este documento describe la propuesta técnica para reemplazar la inclinación CSS 2D por un visor interactivo de relieve 3D real basado en **MapLibre GL JS**, e incorporar nuevas capas de información pública de España (Espacios Naturales Protegidos MITECO, Caminos de Santiago, Spain by Bike, y Refugios de Montaña).

---

## User Review Required

> [!IMPORTANT]
> **Arquitectura Híbrida 2D/3D:**
> Para preservar la robustez de las herramientas de dibujo, cálculo de rutas (snap-to-trail) y edición que ya están construidas sobre Leaflet (2.000 líneas de código), mantendremos **Leaflet para la vista 2D principal**. Cuando el usuario active el modo **"Vista 3D"**, ocultaremos el contenedor de Leaflet y montaremos un nuevo visor de **MapLibre GL JS** que cargará la ruta actual, los waypoints y las capas de mapas seleccionadas superpuestas sobre el **relieve 3D global** (usando teselas de elevación DEM de Mapzen). Al desactivar el 3D, el visor de Leaflet volverá a mostrarse en el mismo punto de edición sin perder estado.

---

## Proposed Changes

### 📦 1. Dependencias e Instalación
* Instalación de `maplibre-gl` finalizada con éxito.
* Integración de los estilos de MapLibre en la aplicación: `import "maplibre-gl/dist/maplibre-gl.css";`.

### 🏔️ 2. Componente de Relieve 3D Real: [Map3DContainer.tsx](file:///c:/Users/jbast/OneDrive/Escritorio/00.CODING-CODE/PIXDEMIA/SummitGPS/src/components/Map3DContainer.tsx) [NEW]
Crearemos un nuevo componente que encapsule el mapa 3D usando MapLibre GL JS:
* **Relieve 3D (DEM):** Usará las teselas de elevación globales de **Mapzen Terrarium** (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`) con exageración de relieve configurable para destacar colinas y cumbres.
* **Sincronización:** Recibirá el centro del mapa, el zoom, el track activo y la lista de waypoints desde `App.tsx` para posicionar la cámara inicialmente en el mismo encuadre que la vista 2D.
* **Cargador de Rutas y Waypoints:**
  * Dibujará el track activo del usuario como una línea tridimensional adaptada automáticamente sobre el relieve.
  * Renderizará marcadores 3D flotantes con los colores corporativos para los waypoints personalizados y puntos de interés.
* **Botón de Vuelo de Cámara (Estilo Relive):** Añadirá un control interactivo que permite animar la cámara (paneo y rotación 3D automática) siguiendo la trayectoria del track actual para emular la experiencia Relive.

### 🌐 3. Integración de Nuevas Capas WMS e Información Pública
Añadiremos soporte para 4 nuevas superposiciones de datos públicos que se renderizarán tanto en la vista 2D (Leaflet) como en la 3D (MapLibre):
1. **Espacios Naturales Protegidos (MITECO):** Capa WMS oficial de áreas naturales y parques protegidos (`https://wms.mapama.gob.es/sig/Biodiversidad/ENP/wms.aspx` | capa `PS.ProtectedSite`).
2. **Caminos de Santiago (IGN):** Capa WMS oficial de rutas de peregrinación jacobeas de España (`https://www.ign.es/wms-inspire/camino-santiago` | capas combinadas).
3. **Rutas Cicloturistas / BTT (Spain by Bike):** Capa WMS oficial de la IDEE con etapas y centros BTT de España (`https://wms-spainbybike.idee.es/spainbybike` | capas `etapas,centros_btt,puertos_pto`).
4. **Refugios de Montaña (OSM Overpass API):** Consulta automática en segundo plano mediante Overpass API para descargar y pintar iconos específicos de refugios guardados (`tourism=alpine_hut`), refugios libres (`tourism=wilderness_hut`) y cobertizos de montaña (`amenity=shelter`) en el encuadre actual del mapa.

### 🎨 4. Interfaz de Usuario y Controles: [FloatingLayerSelector.tsx](file:///c:/Users/jbast/OneDrive/Escritorio/00.CODING-CODE/PIXDEMIA/SummitGPS/src/components/FloatingLayerSelector.tsx) [MODIFY]
* Actualización de la pestaña **Superposiciones** para organizar las nuevas capas de datos públicos con sus respectivos interruptores.
* Inyección de los interruptores para:
  * *Espacios Naturales Protegidos (MITECO)*
  * *Rutas Culturales e IGN (Caminos de Santiago)*
  * *Rutas Ciclistas y BTT (Spain by Bike)*
  * *Refugios de Montaña (OSM)*

### ⚙️ 5. Integración del Flujo de Datos: [App.tsx](file:///c:/Users/jbast/OneDrive/Escritorio/00.CODING-CODE/PIXDEMIA/SummitGPS/src/App.tsx) [MODIFY]
* Definición de los nuevos estados booleanos para el control de visibilidad de las capas WMS y de refugios.
* Reemplazo de la inyección de perspectiva CSS en el contenedor de Leaflet por un renderizado condicional:
  ```tsx
  <div className="flex-1 h-full relative">
    <div className={`w-full h-full ${is3DActive ? "hidden" : "block"}`}>
      <MapContainer
        // props de Leaflet
      />
    </div>
    {is3DActive && (
      <Map3DContainer
        mapCenter={mapCenter}
        activeBaseLayer={activeBaseLayer}
        tracks={tracks}
        activeTrackId={activeTrackId}
        waypoints={waypoints}
        // nuevas capas y opciones
      />
    )}
  </div>
  ```

---

## Verification Plan

### Pruebas Automatizadas
* Ejecutar `npm run build` para asegurar que el compilador de TypeScript y Vite empaquetan la aplicación correctamente sin errores.

### Pruebas Manuales
1. **Activar Vista 3D:** Pulsar el botón **3D** en la barra lateral derecha de controles y verificar que se carga el mapa de MapLibre con relieve real en 3D (se puede rotar manteniendo pulsado el botón derecho del ratón o con Ctrl + arrastrar).
2. **Superposición de Capas:** Activar la capa de *Espacios Naturales Protegidos* y comprobar que se dibujan los polígonos semitransparentes del MITECO delimitando los parques naturales.
3. **Refugios de Montaña:** Activar la capa de *Refugios de Montaña* y verificar que se cargan automáticamente los iconos de los refugios de la zona sin necesidad de buscarlos en la barra lateral.
