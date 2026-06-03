# Fuentes de Información y Capas - SummitGPS

Este documento detalla el origen de todos los datos utilizados actualmente en SummitGPS, describe la arquitectura técnica empleada para su visualización y propone una serie de sugerencias de información pública (WMS/XYZ/APIs) y tecnologías alternativas para lograr representaciones en 3D profesionales similares a Google Earth o Relive.

---

## 1. Origen de los Datos Actuales

### ⛅ Predicción Meteorológica (El Tiempo)
* **Proveedor**: [Open-Meteo](https://open-meteo.com/)
* **Descripción**: Se utiliza su API meteorológica pública y gratuita (para uso no comercial).
* **Características Clave**:
  * **Optimización por Altura**: Permite consultar la meteorología exacta en base a coordenadas de latitud, longitud y **altitud**, lo cual es crítico para rutas de montaña donde la temperatura y condiciones varían drásticamente con respecto al nivel del mar.
  * **Sin Clave de API**: No requiere registro ni claves de acceso para peticiones moderadas.
  * **Datos**: Proporciona condiciones actuales, alertas, pronóstico por horas (temperatura, precipitación, viento, nubosidad) y pronóstico semanal.

### 🥾 Rutas de Senderismo
* **Proveedor**: [Waymarked Trails (Hiking)](https://hiking.waymarkedtrails.org/)
* **Descripción**: Superposición de teselas de mapa (overlays) que renderizan relaciones de rutas de senderismo (`route=hiking`, `route=foot`) procedentes de la base de datos global de **OpenStreetMap (OSM)**.
* **URL de Teselas**: `https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png`
* **Licencia**: Creative Commons Attribution-ShareAlike 3.0 (OSM Contributors).

### 🚴 Rutas de Ciclismo (Cicloturismo, MTB y Carretera)
* **Proveedor**: [Waymarked Trails (Cycling & MTB)](https://cycling.waymarkedtrails.org/)
* **Descripción**: Al igual que el senderismo, procesa las relaciones de rutas de bicicleta (`route=bicycle` y `route=mtb`) de OpenStreetMap.
* **URLs de Teselas**:
  * Ciclismo general: `https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png`
  * Bicicleta de montaña (MTB): `https://tile.waymarkedtrails.org/mtb/{z}/{x}/{y}.png`

### 📍 Waypoints (Marcadores) y Puntos de Interés (POIs)
* **Waypoints del Usuario / Comunidad**: Persistidos en una base de datos **Supabase** (PostgreSQL) con tablas de marcas, carpetas, tracks y retos creados por los usuarios de SummitGPS.
* **Puntos de Interés de la Comunidad (OSM)**: Consultados dinámicamente según el encuadre del mapa utilizando la API **Overpass de OpenStreetMap**. Filtra elementos montañeros específicos como:
  * Cumbres y picos (`natural=peak`)
  * Puertos de montaña (`natural=saddle`)
  * Fuentes y manantiales (`natural=spring`)
  * Lagos y lagunas (`natural=water`)
  * Refugios y albergues (`tourism=alpine_hut`, `tourism=wilderness_hut`)

### ⛰️ Sombreado de Pendiente (Hillshade)
* **Proveedor**: [Esri World Hillshade](https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer)
* **Descripción**: Capa de relieve sombreado global en 3D generada a partir de Modelos Digitales de Elevaciones (DEM) de diversas fuentes de alta resolución (SRTM, LIDAR, etc.).
* **URL de Teselas (XYZ)**: `https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}`
* **Uso**: Se aplica como una capa semitransparente por encima del mapa base para dar sensación de relieve tridimensional, valles y cordilleras.

### 🔥 Mapa de Pendientes (Slope Angle Shading)
* **Proveedor**: [Instituto Geográfico Nacional de España (IGN)](https://www.ign.es/)
* **Descripción**: Capa técnica de pendientes calculada a partir del Modelo Digital del Terreno MDT05 de España. Identifica de manera visual las zonas llanas y colorea las pendientes más empinadas.
* **Uso en Seguridad**: Esencial para planificar rutas invernales y evaluar el **riesgo de aludes** (las avalanchas suelen iniciarse en pendientes de entre 30° y 45°).
* **Servidor (WMS)**: `https://wms-pendientes.idee.es/pendientes` (Capa: `pendientes`)

---

## 2. Sugerencias de Nuevas Fuentes de Información Pública
Para enriquecer SummitGPS con más capas y herramientas útiles para montañeros y ciclistas, se pueden incorporar los siguientes servicios públicos (la mayoría de España y Europa):

### A. Capas Topográficas y Catastro (España)
* **IGN Topográfico de España (MTN25/MTN50)**:
  * El mapa por excelencia para senderismo en España. Detalla senderos locales, curvas de nivel de alta precisión, vegetación y toponimia tradicional.
  * **Servidor (WMS)**: `https://wms.ign.es/wms-telefonica/mapas` (Capas: `MTN25`, `MTN50`, `MTN_Raster`)
  * **Servidor (XYZ/WMTS)**: `https://tms-mapas-raster.idee.es/1.0.0/mapas-raster/{z}/{x}/{y}.jpeg` (Servicio WMTS oficial de IDENA/IGN)
* **Catastro de España**:
  * Permite ver los límites exactos de parcelas privadas, caminos de dominio público y edificaciones rurales. Muy útil para no entrar accidentalmente en fincas cerradas o cotos de caza.
  * **Servidor (WMS)**: `https://ovc.catastro.minhap.es/Cartografia/WMS/ServidorWMS.aspx` (Capas: `Catastro`, `PARCELA`)

### B. Capas Medioambientales y Seguridad
* **Espacios Naturales Protegidos (MITECO)**:
  * Delimita parques nacionales, parques naturales, reservas de la biosfera y zonas ZEPA (Zona de Especial Protección para las Aves). Útil para conocer restricciones de acampada o pernocta.
  * **Servidor (WMS)**: `https://wms.mapama.gob.es/sig/biodiversidad/enp/wms.aspx`
* **Radar de Lluvias en Tiempo Real (AEMET)**:
  * Superposición animada que muestra las precipitaciones detectadas en los últimos minutos por los radares de AEMET. Crucial para tormentas repentinas en verano.
  * **Servidor (WMS)**: `https://wms.aemet.es/wms-radar/radar`

### C. Servicios de Rutas y Redes
* **Red de Senderos de Gran Recorrido (GR), Pequeño Recorrido (PR) y Locales (SL)**:
  * El IGN ofrece un servicio WMS específico con la Red de Rutas homologadas de la FEDME (Federación Española de Deportes de Montaña y Escalada).
  * **Servidor (WMS)**: `https://wms.ign.es/wms/rutas-senderos`
* **Refugios de Montaña Federativos**:
  * Integrar de forma directa la base de datos de refugios guardados y libres de federaciones españolas y francesas (por ejemplo, mediante scraping autorizado de la FEDME o FEEC, o consumiendo APIs europeas de refugios).

---

## 3. El Problema del 3D en la Web y Alternativas Reales

### ¿Por qué el "3D" actual no se ve realista?
El sistema actual en SummitGPS utiliza un truco visual mediante CSS en Leaflet:
```css
transform: perspective(1200px) rotateX(25deg) scale(1.03);
```
Este método simplemente **inclina la imagen plana bidimensional (2D) del mapa**. 
* **Ventaja**: Es muy ligero y no consume recursos de GPU.
* **Inconveniente**: No genera relieve real. Las montañas se siguen viendo planas desde la perspectiva inclinada, los valles no tienen profundidad y no existe un verdadero volumen tridimensional para el terreno ni para el track GPX.

### ¿Cómo lo hacen Google Earth o Relive?
Estas plataformas utilizan un **Modelo Digital de Elevaciones (DEM) tridimensional real** y renderizan el terreno mediante **WebGL/WebGPU**:
1. **Google Earth**: Utiliza su propio motor gráfico WebGL con modelos 3D de alta resolución (fotogrametría y mallas de terreno de satélites).
2. **Relive**: Toma el track GPX, calcula una ruta de cámara animada y renderiza una escena 3D en un entorno virtual (utilizando motores de juego como **Unity** o motores web como **Three.js** o **Mapbox/MapLibre** en un servidor sin cabezal (headless browser) para exportar el vídeo).

---

### Alternativas Viables para SummitGPS

Si deseas actualizar SummitGPS para tener un 3D real y espectacular, estas son las mejores opciones públicas y de código abierto:

#### Opción A: Migrar o integrar MapLibre GL JS (Recomendada)
[MapLibre GL JS](https://maplibre.org/) es una biblioteca de mapas de código abierto en JavaScript, extremadamente rápida y basada en WebGL2. Soporta **terreno 3D real de forma nativa**.
* **Cómo funciona**: Carga imágenes especiales llamadas "Terrain-DEM" (imágenes RGB donde el color rojo, verde y azul de cada píxel codifica la altitud exacta de ese punto). Con esta información, MapLibre deforma la rejilla geométrica del mapa en tiempo real, creando colinas, montañas y valles reales.
* **Fuentes de terreno gratuitas**:
  * **Copernicus DEM** (Global, alta calidad).
  * **Mapzen Terrain Tiles / Nextzen** (Disponibles públicamente en AWS de forma gratuita).
* **Para el track GPX**: El track se proyecta sobre la superficie 3D y se dibuja como una línea flotante o adherida al relieve.
* **Efecto Relive**: MapLibre permite programar animaciones de cámara fluidas (`map.flyTo`, rotaciones, cambios de pitch). Puedes crear un botón "Reproducir Ruta" que mueva la cámara en 3D automáticamente siguiendo el track GPX del usuario.

#### Opción B: CesiumJS (El "Google Earth" de código abierto)
[CesiumJS](https://cesium.com/platform/cesiumjs/) es el estándar de la industria para globos terráqueos en 3D interactivos en la web.
* **Ventajas**: Renderizado tridimensional perfecto del globo terráqueo completo, soporte de atmósfera, sombras en tiempo real según la posición del sol y carga nativa de terrenos optimizados.
* **Inconvenientes**: Es una biblioteca pesada con una curva de aprendizaje empinada y una estética más técnica/científica que recreativa.

#### Opción C: Three.js para una "Vista Previa 3D" en un Modal (Fácil Integración)
En lugar de cambiar todo el mapa principal de Leaflet (lo cual requeriría reescribir gran parte de la aplicación), puedes mantener Leaflet en 2D y añadir un botón de **"Vista 3D"**.
* Al pulsar este botón, se abre un modal interactivo que inicia una escena en **Three.js** (utilizando bibliotecas como `three-geo` o `deck.gl`).
* Este modal descarga el recorte del terreno alrededor de la ruta actual, construye la montaña en 3D, le pega la imagen del mapa como textura y dibuja el track GPX encima en 3D.
* **Experiencia de usuario**: El usuario puede rotar con el ratón la montaña de su ruta de forma interactiva (estilo maqueta 3D), lo cual da un aspecto sumamente "premium" e interactivo sin interferir con la rapidez del mapa de planificación en 2D.
