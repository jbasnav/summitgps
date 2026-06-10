# Informe de Auditoría y Control de Calidad (SummitGPS)

Este documento reúne las evaluaciones de nuestro equipo multidisciplinar de desarrollo sobre la aplicación **SummitGPS**. El análisis cubre aspectos de **Garantía de Calidad (QA)**, **Diseño UX/UI** y **Estrategia de Producto (PM)**.

---

## 🕵️‍♂️ 1. Reporte del Ingeniero de QA (Control de Calidad)

El análisis del código fuente y los flujos lógicos ha revelado varios puntos críticos que podrían comprometer la estabilidad e integridad de los datos de la aplicación:

### 🚨 Hallazgos Críticos
1. **Desincronización y Pérdida de Datos en Modo Offline:**
   - *Fallo:* Si un usuario edita o crea rutas sin conexión (offline), el cliente almacena estos cambios temporalmente en `localStorage`. Sin embargo, al reconectarse y refrescar la página, el cliente ve que existen rutas en la nube (`dbTracks.length > 0`) y sobrescribe inmediatamente el `localStorage` con la base de datos desactualizada, borrando todo el trabajo realizado sin conexión.
2. **Condición de Carrera en Deshacer/Rehacer (Undo/Redo):**
   - *Fallo:* La base de datos asíncrona de Supabase ejecuta un `.delete()` seguido de un `.insert()` para guardar el estado de los marcadores en cada deshacer/rehacer. Si el usuario pulsa repetida y rápidamente Undo/Redo, las peticiones de borrado e inserción se desordenan en tránsito debido a la latencia de la red, disparando errores de violación de clave primaria (`unique constraint`) e inconsistencias de estado.
3. **Control de Tasas en Nominatim (Geocodificación de Street View):**
   - *Fallo:* El arrastre del marcador de Street View tiene un debounce de solo 400ms. Si se arrastra de forma continua, se supera el límite estricto de 1 petición/segundo de la política oficial de Nominatim de OpenStreetMap, devolviendo errores HTTP 429 y arriesgando el bloqueo completo de la IP del cliente.

### ⚠️ Limitaciones y Fallbacks
* **Manejo de Respuestas de Wikipedia:** Contiene bloques `.catch(() => {})` vacíos. Ante una caída de red o CORS, el spinner de carga simplemente desaparece y muestra erróneamente "No se encontraron artículos cercanos".
* **Overpass en Mapa 3D:** Solo intenta conectar con el servidor principal, a diferencia del Sidebar que tiene 4 servidores de respaldo. Si falla, los refugios no se cargan y no hay feedback para el usuario.
* **Importación de Relaciones OSM Desordenadas:** Si una ruta/sendero de OSM está fragmentada o desordenada (o contiene sub-relaciones como los senderos GR), el trazado de importación genera líneas caóticas en zigzag en lugar de una ruta lineal correcta.
* **Filtro Estricto de Enrutamiento:** El verificador de fallbacks de GraphHopper/OSRM descarta la ruta si el trazado calculado supera por 3 el trazado lineal directo. En montañas con senderos sinuosos y curvas de nivel cerradas, esta proporción se supera comúnmente, causando que la app descarte el trazado preciso y trace líneas rectas forzadas de fallback.

---

## 🎨 2. Reporte del Diseñador UX/UI

El análisis de diseño y experiencia de usuario resalta aspectos de visualización y usabilidad premium:

### 🚨 Fallos de Layout y Responsividad
1. **Desbordamiento del Point Info Drawer:**
   - *Fallo:* El panel lateral de detalles de ubicación se posiciona mediante `left: isSidebarCollapsed ? 64 : 380` con un ancho rígido de `340px-380px`. En móviles y tablets con pantallas inferiores a `768px`, este panel se desborda y sale completamente de los límites visuales, imposibilitando su lectura.
2. **Superposición de la Elevación y Sidebar:**
   - *Fallo:* En pantallas medianas (ej. portátiles pequeños de 13" o iPads horizontales), el contenedor del perfil de elevación (`w-[min(640px,calc(100%-200px))]`) colisiona visualmente con la barra lateral izquierda expandida (`380px`), tapando controles y entorpeciendo la vista.

### 💡 Sugerencias de Usabilidad Premium
* **Interacción del Perfil de Elevación Combinado:** A diferencia del perfil de elevación individual, el `CombinedElevationProfile.tsx` carece de interactividad (hover sincronizado con el mapa y selección de rango con zoom `fitBounds`), comportándose como un gráfico estático y restando valor a la comparación de tracks.
* **Carga Cognitiva en Modo Dibujo:** Los controles principales de trazado se encuentran dispersos (el botón de finalizar abajo en el mapa, y los de deshacer y limpiar en la barra lateral), forzando viajes innecesarios y cansados del cursor.
* **Accesibilidad (WCAG 2.1 AA):**
  - Hay un uso excesivo de clases de tipografía extremadamente pequeña (`text-[8.5px]`, `text-[8px]`) en tablas de datos secundarios.
  - El texto informativo en gris claro (`#64748b`) sobre fondo de interfaz verde oscuro tiene un contraste insuficiente de **2.5:1** (el estándar es mínimo **4.5:1**). Esto dificulta la visibilidad en exteriores bajo la luz solar directa.

---

## 💼 3. Reporte del Product Manager (Estrategia de Producto)

### 🌟 Análisis de Propuesta de Valor
SummitGPS posee una integración única de funcionalidades de gran interés para el usuario de montaña/ciclismo:
* **Trazado Inteligente (Snap-to-Trail):** Excelente doble motor (GraphHopper + BRouter) para clasificar superficies.
* **Importación FIT:** La capacidad de importar archivos FIT deportivos (con pulso cardíaco, potencia y cadencia) e integrarlos con datos geográficos y de relieve diferencia fuertemente a la aplicación.
* **Seguridad en Montaña:** Características de vanguardia como la tasa adiabática (-0.65 °C por cada 100m) y el simulador de sombras solares son herramientas de seguridad muy valoradas.

### 📋 Backlog Priorizado para Próximos Despliegues

| Prioridad | Característica | Descripción | Complejidad |
| :--- | :--- | :--- | :--- |
| **1. Alta** | **Modo Fuera de Línea (Offline Maps)** | Caché local de teselas de mapas y almacenamiento IndexedDB de la ruta mediante PWA para uso seguro sin cobertura móvil. | Alta |
| **2. Media** | **Buscador Social de Rutas** | Galería y mapa de descubrimiento para explorar rutas públicas (`is_public = true`) compartidas por la comunidad. | Media |
| **3. Baja** | **Detección de Rampas (ClimbPro)** | Análisis automático de pendientes coloreando la ruta y el perfil según la inclinación (de verde a negro). | Media-Baja |
