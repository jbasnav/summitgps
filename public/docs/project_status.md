# 📋 Estado del Proyecto - SummitGPS

Este documento consolida y prioriza todas las tareas, errores y sugerencias de mejora identificados en las auditorías de **Garantía de Calidad (QA)**, **Diseño UX/UI** y **Gestión de Producto (PM)**. Su objetivo es servir como la fuente única de verdad para el desarrollo, seguimiento de estado y asignación de tareas en SummitGPS.

---

## 🚦 Resumen del Estado de Tareas

| Prioridad | Total Tareas | Pendientes | En Progreso | Completadas |
| :--- | :---: | :---: | :---: | :---: |
| 🔴 **Crítico** | 5 | 0 | 0 | 5 |
| 🟡 **Alto** | 2 | 0 | 0 | 2 |
| 🟢 **Medio** | 5 | 0 | 0 | 5 |
| 🔵 **Bajo** | 4 | 4 | 0 | 0 |
| **Total** | **16** | **4** | **0** | **12** |

---

## 🛠️ Backlog Unificado y Priorizado

### 🔴 Prioridad: Crítico (Bloquea estabilidad de datos o usabilidad básica)

| ID | Origen | Tarea / Bug | Descripción | Estado | Asignado a |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **QA-1** | QA | **Pérdida de datos offline** | Al reconectarse y refrescar, si existen rutas en la nube (`dbTracks.length > 0`), el cliente sobrescribe `localStorage` con la base de datos desactualizada, borrando las rutas creadas/editadas sin conexión. | 🟢 Completado | `desarrollador_core` |
| **QA-2** | QA | **Condición de carrera Undo/Redo** | Supabase ejecuta `.delete()` + `.insert()` asíncronos en deshacer/rehacer. Pulsaciones rápidas desordenan peticiones en red, causando violaciones de clave primaria e inconsistencias de estado. | 🟢 Completado | `desarrollador_core` |
| **QA-3** | QA | **Límite de peticiones de Nominatim** | El arrastre de Street View tiene un debounce de 400ms. Si es continuo, supera el límite de 1 petición/s de Nominatim, devolviendo HTTP 429 y arriesgando bloqueo de IP. | 🟢 Completado | `desarrollador_core` |
| **UX-1** | UX | **Desbordamiento Point Info Drawer** | En pantallas móviles/tablets (<768px), el panel se desborda lateralmente al usar `left: isSidebarCollapsed ? 64 : 380` con ancho rígido. | 🟢 Completado | `ux_designer` |
| **UX-2** | UX | **Colisión Perfil Elevación / Sidebar** | En portátiles de 13" o iPads horizontales, el perfil de elevación colisiona visualmente con el sidebar expandido (380px), tapando controles del mapa. | 🟢 Completado | `ux_designer` |

### 🟡 Prioridad: Alto (Funcionalidades clave o problemas operativos importantes)

| ID | Origen | Tarea / Bug | Descripción | Estado | Asignado a |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **PM-1** | PM | **Modo Fuera de Línea (Offline Maps)** | Implementar caché de teselas de mapas y almacenamiento IndexedDB de la ruta activa mediante PWA para uso seguro en montaña sin cobertura. | 🟢 Completado | `desarrollador_offline` |
| **QA-6** | QA | **Trazado caótico en Relaciones OSM** | Si una ruta de OSM está fragmentada o desordenada (o incluye sub-relaciones como senderos GR), la importación dibuja líneas en zigzag caóticas en el mapa. | 🟢 Completado | `desarrollador_core` |

### 🟢 Prioridad: Medio (Mejoras de usabilidad e interactividad)

| ID | Origen | Tarea / Bug | Descripción | Estado | Asignado a |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **UX-3** | UX | **Interactividad en Perfil Combinado** | El componente `CombinedElevationProfile.tsx` es un gráfico estático. Requiere interactividad de hover sincronizado con el mapa y zoom al seleccionar rango (`fitBounds`). | 🟢 Completado | `ux_designer` |
| **QA-4** | QA | **Fallback vacío de Wikipedia** | Manejo de respuestas de Wikipedia usa `.catch(() => {})`. Si falla la red o CORS, el spinner desaparece y muestra "No se encontraron artículos cercanos" erróneamente. | 🟢 Completado | `desarrollador_core` |
| **QA-5** | QA | **Falta de feedback Overpass en 3D** | El visor 3D solo conecta al servidor principal de Overpass (sin usar los 4 respaldos del sidebar). Si cae, no se cargan los refugios y no hay feedback de error. | 🟢 Completado | `desarrollador_core` |
| **QA-7** | QA | **Filtro estricto de GraphHopper/OSRM** | El verificador de fallbacks descarta la ruta si el trazado calculado supera por 3 el trazado lineal directo. En montañas sinuosas, esto obliga a trazar líneas rectas erróneas. | 🟢 Completado | `desarrollador_core` |
| **PM-2** | PM | **Buscador Social de Rutas** | Desarrollar una galería y mapa de descubrimiento para que los usuarios busquen y exploren rutas públicas (`is_public = true`) de otros miembros. | 🟢 Completado | `desarrollador_social` |

### 🔵 Prioridad: Bajo (Estética, accesibilidad o mejoras menores)

| ID | Origen | Tarea / Bug | Descripción | Estado | Asignado a |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **UX-4** | UX | **Carga cognitiva en dibujo** | Controles dispersos: botón "Finalizar" abajo en el mapa, y botones "Deshacer" y "Limpiar" en la barra lateral izquierda. | 🔵 Pendiente | `ux_designer` |
| **UX-5** | UX | **Accesibilidad: Tipografía pequeña** | Uso de clases CSS con tipografía excesivamente pequeña (`text-[8.5px]`, `text-[8px]`) en tablas de datos secundarios. | 🔵 Pendiente | `ux_designer` |
| **UX-6** | UX | **Accesibilidad: Contraste insuficiente** | El texto gris claro (`#64748b`) sobre fondo verde oscuro tiene un contraste de 2.5:1 (requiere 4.5:1 para WCAG 2.1 AA), dificultando su lectura bajo luz solar. | 🔵 Pendiente | `ux_designer` |
| **PM-3** | PM | **Detección de Rampas (ClimbPro)** | Análisis automático de pendientes coloreando la ruta y el perfil según la inclinación (de verde a negro) estilo Garmin ClimbPro. | 🔵 Pendiente | `desarrollador_core` |

---

## 🚀 Entregas de Trabajo por Sprints

### Sprint 1: Estabilización de Datos y Layout (Completado)
* **Objetivos:** Corrección de los 5 errores Críticos (**QA-1, QA-2, QA-3, UX-1, UX-2**).
* **Resultado:** Se estabilizaron el flujo de fusión no destructiva local/nube, la cola secuencial de escritura a Supabase, el debounce de geocodificación de Street View a 1100ms y el layout responsivo del Drawer.

### Sprint 2: Capacidades Offline y Ensamblado de OSM (Completado)
* **Objetivos:** Implementación de las 2 características de alta prioridad (**PM-1** y **QA-6**).
* **Resultado:**
  1. **Algoritmo de Ensamblado de Relaciones OSM (QA-6):** Se reemplazó la concatenación simple con un algoritmo de agrupación geométrica por cercanía de extremos (tolerancia <25m) con volteado automático de sentidos y unión con vecino más cercano.
  2. **Modo Offline PWA (PM-1):**
     * Registro de Service Worker para interceptar y guardar en caché dinámicamente recursos estáticos y teselas de mapas.
     * Almacenamiento local IndexedDB (`summit_offline_db`) para persistir de manera transparente la ruta activa.
     * Pool de descargas asíncronas de teselas de zoom 12 a 15 y UI de progreso de caché.

### Sprint 3: Interactividad, Resiliencia de APIs y Exploración Social (Completado)
* **Objetivos:** Implementar y resolver 5 tareas de prioridad media (**UX-3, QA-4, QA-5, QA-7, PM-2**).
* **Resultado:**
  1. **Interactividad en Perfil Combinado (UX-3):** Gráfico interactivo en `CombinedElevationProfile.tsx` que admite hover sincronizado interpolando distancias (`onHoverPoint`) y zoom mediante arrastre de cursor calculando coordenadas extremas (`fitBounds` sobre `mapInstance`).
  2. **Resiliencia en Wikipedia API (QA-4):** Modificado `WaypointInfoModal.tsx` para interceptar de forma amigable los fallos de red y CORS, impidiendo spinners infinitos y falsos mensajes de "no encontrado".
  3. **Servidores Fallback Overpass 3D (QA-5):** En `Map3DContainer.tsx`, se añadieron llamadas secuenciales en cascada a los 4 servidores Overpass secundarios con notificaciones `customAlert` si todos fallan. Se eliminó la dependencia `center` en el hook de actualización de datos para impedir loops de red infinitos.
  4. **Ratio de Ruteo Tolerante (QA-7):** Modificado `useRoutePlanner.ts` extendiendo los ratios tolerables de longitud de ruta frente a línea recta (4.0 para OSRM y 4.5 para GraphHopper), eliminando el descarte incorrecto de trazados sinuosos de montaña.
  5. **Buscador y Mapa de Descubrimiento Social (PM-2):** Se implementó una opción de **Previsualización** en la pestaña de Comunidad (`Sidebar.tsx`) y una capa efímera en `MapContainer.tsx` que dibuja en rosa brillante discontinuo (`#ff3366`) y hace `fitBounds` a la ruta elegida sin forzar su importación, incluyendo banners interactivos flotantes en `App.tsx` para desactivarla con facilidad.

---

> [!NOTE]
> **Próximos Pasos para el Coordinador (Tech Lead):**
> 1. Iniciar planificación del Sprint 4 para abordar mejoras estéticas y de accesibilidad de prioridad baja (**UX-4, UX-5, UX-6, PM-3**).
