# ⛰️ Manual de Usuario - SummitGPS

¡Bienvenido a **SummitGPS**! La herramienta de planificación de rutas de montaña, senderismo y ciclismo de precisión. Este manual te guiará a través de todas las funcionalidades integradas en la aplicación para que puedas planificar tus actividades al aire libre con total seguridad y máximo detalle técnico.

---

## 📌 Índice de Contenidos
1. [Introducción y Configuración Inicial](#1-introducción-y-configuración-inicial)
2. [Planificación de Rutas (Trazado 2D)](#2-planificación-de-rutas-trazado-2d)
3. [Herramientas de Edición Avanzada](#3-herramientas-de-edición-avanzada)
4. [Capas de Mapas y Superposiciones Oficiales (WMS)](#4-capas-de-mapas-y-superposiciones-oficiales-wms)
5. [Gestión de Marcadores (Waypoints) y POIs](#5-gestión-de-marcadores-waypoints-y-pois)
6. [Meteorología de Precisión y Seguridad](#6-meteorología-de-precisión-y-seguridad)
7. [Visualización en 3D Real (Vuelo Relive)](#7-visualización-en-3d-real-vuelo-relive)
8. [Importación de Datos y Sensores (FIT, GPX, KML)](#8-importación-de-datos-y-sensores-fit-gpx-kml)
9. [Impresión de Mapas y Cuadrículas de Rescate](#9-impresión-de-mapas-y-cuadrículas-de-rescate)
10. [Sincronización y Modo Offline](#10-sincronización-y-modo-offline)

---

## 1. Introducción y Configuración Inicial

SummitGPS te permite trabajar tanto en modo **Invitado (Local)** como en modo **Registrado (Sincronizado)** a través de la integración con Supabase. 
* **Modo Invitado:** Tus rutas y marcadores se guardan exclusivamente en el navegador (`localStorage`). Si limpias el historial de navegación, podrías perder los datos.
* **Modo Registrado:** Al iniciar sesión con tu cuenta, todos tus tracks se guardan en la nube de forma segura. Si pierdes la conexión en la montaña, la app sigue guardando tus cambios de forma local y los sincronizará automáticamente al detectar cobertura de red.

---

## 2. Planificación de Rutas (Trazado 2D)

El panel izquierdo de **Ruta** es el corazón del trazador. Para dibujar una ruta:
1. **Activar "Dibujar Ruta":** Pulsa el botón del lápiz en el panel izquierdo. Tu cursor en el mapa se convertirá en una cruz.
2. **Snap-to-Trail (Trazado Inteligente):** 
   - Cuando esta opción está activada, al hacer clic en dos puntos alejados del mapa, SummitGPS calculará la ruta óptima siguiendo los senderos reales.
   - Puedes cambiar el perfil del deporte: **Senderismo (Foot/Hiking)**, **Ciclismo de Carretera (Road)** o **Bicicleta de Montaña (MTB)**.
   - Si deseas trazar a campo traviesa o donde no existan caminos en el mapa, desactiva la opción "Imán" (Snap) para trazar líneas rectas directas de punto a punto.
3. **Guardado:** Asigna un nombre al track en la barra superior de la pestaña de ruta y pulsa guardar.

---

## 3. Herramientas de Edición Avanzada

En la pestaña **Ruta**, bajo el menú de edición de track activo, tienes herramientas profesionales de manipulación de líneas:
* **Edición de Vértices:** Permite arrastrar libremente cualquier punto intermedio de la ruta ya dibujada para reajustar su recorrido en el mapa.
* **Cortar Ruta (Split):** Haz clic sobre cualquier punto de la ruta en el mapa para dividir el track en dos segmentos independientes.
* **Simplificar Track:** Reduce el número de puntos GPS mediante el algoritmo de Douglas-Peucker (útil para reducir el tamaño del archivo de rutas muy largas antes de exportar).
* **Suavizar Track (Smooth):** Suaviza curvas cerradas y elimina temblores digitales del GPS en el track.
* **Limpiar Área:** Dibuja un rectángulo en el mapa para borrar instantáneamente cualquier tramo de la ruta que pase por dentro de esa zona geográfica.
* **Invertir Trazado:** Cambia el sentido de la marcha (el punto de inicio se convierte en el de llegada).
* **Crear Bucle (Ida y Vuelta):** Duplica la ruta en sentido inverso para calcular los desniveles de regreso en formato circular.

---

## 4. Capas de Mapas y Superposiciones Oficiales (WMS)

En la pestaña **Capas (Layers)**, puedes personalizar la cartografía base y superponer datos específicos de seguridad y medio ambiente:
* **Mapas Base:** Alterna entre OpenStreetMap estándar, OpenTopoMap (ideal para curvas de nivel de relieve), e imágenes de satélite de alta resolución (ArcGIS).
* **Capas Especiales WMS (España):**
  - **Espacios Protegidos (MITECO):** Muestra los límites de Parques Nacionales, Naturales y Reservas Biosfera en color verde translúcido. Evita meterte en zonas restringidas o de conservación.
  - **Caminos de Santiago (IGN):** Dibuja en rojo todas las variantes oficiales del Camino de Santiago.
  - **Spain by Bike / BTT:** Muestra puertos de montaña oficiales, centros de BTT y etapas ciclistas.
  - **Refugios de Montaña:** Carga automáticamente desde OpenStreetMap la ubicación exacta de cabañas y refugios de emergencia en la zona visible del mapa.

---

## 5. Gestión de Marcadores (Waypoints) y POIs

Los **Waypoints** son marcas geográficas en el mapa que representan puntos de decisión, campamentos, cumbres o peligros:
* **Crear Waypoint:** Haz clic derecho en cualquier parte del mapa o pulsa en "Crear Marcador en el centro". Puedes asignarle un icono personalizado (pico, agua, cámara de fotos, tienda de campaña), nota explicativa, color identificativo y un enlace o foto de referencia.
* **Wikipedia Integrada:** Al abrir la información de un marcador, SummitGPS consulta de forma automática la base de datos de Wikipedia para mostrarte artículos y descripciones históricas o geográficas de cumbres o pueblos situados a menos de 20 km del marcador.
* **OSM POI Downloader:** En la pestaña **Marcadores**, puedes pedirle a la aplicación que descargue instantáneamente desde OpenStreetMap todas las fuentes de agua potable, cumbres de montaña, miradores o sitios de acampada dentro de la zona visible del mapa, permitiendo guardarlos como waypoints personales con un solo clic.

---

## 6. Meteorología de Precisión y Seguridad

Al hacer clic en cualquier punto del mapa o sobre un marcador y abrir el menú de detalles, accederás a la suite meteorológica de montaña **OpenSnow**:
* **Previsión Diaria e Histórica:** Muestra temperatura, probabilidad de precipitación, velocidad y dirección de ráfagas de viento y horarios de orto/ocaso (amanecer/anochecer).
* **Corrección Adiabática por Altitud (Lapse Rate):** La temperatura en montaña disminuye unos **-0.65 °C por cada 100 metros** de elevación. SummitGPS toma los datos meteorológicos generales de la cota base y calcula matemáticamente la temperatura real estimada en la altitud exacta de tu cumbre utilizando el modelo de elevación digital (DEM).

---

## 7. Visualización en 3D Real (Vuelo Relive)

Visualiza el relieve físico y la pendiente real de tus rutas en tres dimensiones:
1. Haz clic en el botón **"Vista 3D"** (el icono de globo terráqueo en la barra de herramientas).
2. Se abrirá el modal interactivo que renderiza el relieve real utilizando tecnología de elevación digital ArcGIS.
3. Puedes rotar la cámara (clic izquierdo + arrastrar), inclinar la vista para apreciar las paredes verticales, y hacer zoom.
4. **Volar Ruta (Simulador):** Haz clic en el botón de reproducción en el HUD inferior para iniciar una animación de vuelo de cámara en primera persona que recorre todo el trazado de tu ruta a baja altura, simulando un video en relieve de tus progresos.
5. Puedes ajustar la **Exageración del Relieve** mediante el deslizador inferior (hasta 4x) para acentuar y comprender mejor la dificultad de las crestas y valles.

---

## 8. Importación de Datos y Sensores (FIT, GPX, KML)

SummitGPS es totalmente compatible con formatos geográficos y deportivos estándar:
* **GPX / KML / GeoJSON:** Importa rutas dibujadas en otras herramientas arrastrando el archivo al mapa o usando el botón de importación. Conservará tanto la línea del track como los waypoints embebidos.
* **Archivos FIT (Garmin/Wahoo):** Importa entrenamientos y recorridos reales guardados por tu reloj o ciclocomputador. SummitGPS extraerá la ruta y sincronizará en la gráfica de elevación los datos grabados de tus sensores biométricos:
  - **Frecuencia Cardíaca (Pulsaciones)**
  - **Potencia (Vatios)**
  - **Cadencia de pedaleo/zancada**
  - **Velocidad de avance**
  El mapa pintará la línea de la ruta en gradientes de colores (de verde a rojo) basándose en la métrica deportiva elegida para que analices dónde realizaste tu mayor esfuerzo físico.

---

## 9. Impresión de Mapas y Cuadrículas de Rescate

Planifica tus sistemas de seguridad de respaldo en papel ante fallos de batería en montaña:
1. Pulsa el icono de la **Impresora** en la parte superior derecha de la pantalla.
2. **Formato de Coordenadas:** Selecciona tu sistema de referencia preferido:
   - **Grados Decimales (DD):** `43.1906, -4.8322` (Formato móvil estándar).
   - **Grados, Minutos, Segundos (DMS):** `43°11'26" N, 4°49'55" W`.
   - **UTM (Universal Transverse Mercator):** Sistema cartográfico militar y de rescate.
   - **MGRS (Military Grid Reference System):** Precisión absoluta de cuadrícula de 1 metro.
3. **Cuadrícula en el Mapa:** Puedes activar una cuadrícula visible que dibuja sobre el mapa las líneas exactas UTM o MGRS con sus etiquetas identificativas.
4. **Exportación a PDF:** Ajusta la escala visual y exporta un documento PDF de alta resolución listo para imprimir, que incluye una leyenda de distancias y el perfil de elevación de tu ruta en el pie de página del mapa.

---

## 10. Sincronización y Modo Offline

SummitGPS está construida bajo la arquitectura de una **Progressive Web App (PWA)**:
* **Uso sin Conexión:** Si cargas la aplicación en tu navegador teniendo conexión a internet, la aplicación almacenará en caché los archivos base para que puedas seguir abriéndola en zonas remotas de montaña sin cobertura.
* **Base de Datos Local (IndexedDB):** La aplicación almacena localmente de forma segura las teselas de mapas consultadas recientemente y la información del track activo en IndexedDB.
* **Sincronización Inteligente de Red:** Al recuperar señal de red, el gestor asíncrono sincroniza los datos locales acumulados con tu cuenta en la nube de Supabase sin crear duplicados o sobreescrituras destructivas.

---

> [!TIP]
> **Recomendación de Seguridad:**
> Aunque SummitGPS dispone de herramientas avanzadas offline, la montaña es impredecible. **Lleva siempre una copia impresa en papel del mapa de tu ruta (usando la herramienta de Impresión UTM)** y una brújula física como sistema de seguridad secundario.
