# 🏔️ Manual de Instrucciones de SummitGPS
¡Bienvenido a **SummitGPS**, la suite cartográfica digital premium diseñada para montañistas, senderistas y profesionales de actividades al aire libre! Este manual técnico y operativo detalla exhaustivamente todas las herramientas y capacidades integradas en la aplicación para planificar, analizar, imprimir y gestionar tus aventuras con precisión milimétrica.

---

## 🧭 1. Planificación y Dibujo de Rutas

SummitGPS ofrece un potente motor de trazado de tracks que equilibra la libertad del dibujo manual con la precisión de los algoritmos de enrutamiento inteligente.

### 🥾 Perfiles de Enrutamiento Inteligente (Snap-to-Trail)
Al trazar una ruta, puedes seleccionar entre cuatro modos de enrutamiento optimizados a través de los motores **OSRM** y **Brouter**:

*   **🥾 Senderismo (Hike):** Utiliza el perfil alpino avanzado `Hiking-Alpine-SAC6` en Brouter y `/foot/` en OSRM. Prioriza senderos homologados (GR, PR), senderos de montaña estrechos, vías pecuarias y caminos forestales, evitando autopistas y carreteras principales.
*   **🚴 Ciclismo (Cycle):** Basado en el perfil de trekking. Calcula el recorrido ideal por pistas forestales transitables, vías verdes y ciclovías pavimentadas o compactas.
*   **🚗 Vehículo (Drive):** Optimizado para la circulación con vehículos. Traza rutas por carreteras pavimentadas, pistas forestales aptas para vehículos motorizados y caminos de tierra de ancho completo.
*   **📏 Línea Recta (Straight):** Desactiva el auto-ajuste de caminos. Une los puntos mediante líneas geodésicas directas, ideal para exploración campo a través, navegación invernal sobre nieve virgen o zonas sin cartografía digital.

> [!TIP]
> Puedes alternar dinámicamente entre diferentes perfiles de enrutamiento en medio del trazado de una misma ruta. Por ejemplo, dibuja por senderismo hasta un barranco inaccesible, selecciona "Línea Recta" para cruzarlo visualmente, y vuelve a activar "Senderismo" para continuar por los caminos del otro lado.

### ✂️ Herramientas de Edición Avanzada de Tracks
*   **Inversión de Ruta (Reverse Track):** Haciendo clic en el botón `Invertir Ruta` (icono ⇄), puedes reorientar instantáneamente la dirección del track. El sistema reordenará todos los puntos geodésicos del trazado, recalculará las distancias acumuladas de origen a fin y actualizará en tiempo real el perfil de elevación interactivo.
*   **Dividir Ruta (Split Track):** Permite cortar la ruta activa en dos tracks independientes. Al seleccionar un punto en el mapa, puedes elegir la opción de corte para dividir el trayecto y administrar cada segmento por separado.
*   **Fusionar Rutas (Merge Tracks):** Selecciona múltiples rutas de tu biblioteca y combínalas en una única traza continua. El sistema unirá inteligentemente el final de una ruta con el inicio de la siguiente mediante una línea recta de transición o calculando el tramo intermedio según el perfil de ruta activo.
*   **Deshacer (Undo):** Cancela el último punto añadido a la ruta en caliente para corregir errores de trazado rápidos.
*   **Limpieza (Clear):** Elimina por completo los puntos de la ruta activa de la mesa de dibujo.

---

## 📍 2. Waypoints y Marcación de Campo

Los waypoints no son solo marcas espaciales; en SummitGPS actúan como verdaderos contenedores de información de campo enriquecida y herramientas de geolocalización avanzada.

### ➕ Creación y Personalización de Waypoints
Haciendo clic derecho sobre cualquier parte del mapa se abre el diálogo de creación de waypoint, donde podrás configurar:
1.  **Metadatos Básicos:** Nombre identificativo, notas descriptivas detalladas y enlaces web de referencia (como reseñas de blogs de montaña o fichas de parques naturales).
2.  **Alineación Visual:** Biblioteca de iconos temáticos específicos de outdoor (cimas 🏔️, fuentes de agua 💧, refugios ⛺, miradores 📸, banderas, etc.) y una paleta de colores de acento para la clasificación visual sobre el terreno.
3.  **Multimedia Enriquecida:** Si estás registrado, puedes subir fotografías reales tomadas en el punto directo a la nube mediante la integración con **Supabase Storage**. Las fotos se renderizan como portadas en la tarjeta de detalles del waypoint.

### 🏆 Retos y Challenges (Agrupaciones Interactivas)
Puedes agrupar tus waypoints en "Retos" interactivos (como *“Los 10 techos provinciales”* o *“Fuentes de la Sierra”*):
*   Cada reto cuenta con una imagen de portada panorámica personalizable.
*   Puedes marcar waypoints como **Realizados o Visitados** mediante el botón de verificación (check).
*   Al completar un hito, la marca se tachará elegantemente en el listado y una **barra de progreso interactiva** con efecto de brillo calculará en tiempo real el porcentaje de finalización del reto. ¡Al alcanzar el 100%, se desbloqueará una copa de trofeo animada!

### 🔍 Buscador de Coordenadas Inteligente
El buscador del mapa cuenta con un parser sintáctico multiformato que detecta automáticamente los estándares cartográficos más utilizados en el mundo militar y civil:

*   **Grados Decimales (DD):** `40.4167, -3.7037` (Latitud, Longitud).
*   **Grados Minutos Segundos (DMS):** `40°25'00"N 3°42'13"W` o `40 25 00 N, 3 42 13 W`.
*   **UTM (Universal Transverse Mercator):** `30T 440310 4474320` o `30S 456789 4509123` (Husos del 1 al 60, bandas de latitud, coordenadas Este y Norte).
*   **MGRS (Military Grid Reference System):** `30TVN4031074320` o `30S WN 1234 5678` (Representación militar de alta densidad).

Al introducir cualquiera de estos formatos, el buscador ofrecerá dos acciones inmediatas:
1.  **Centrar Mapa:** Desplaza suavemente la vista (Fly-to) directamente sobre el punto geográfico especificado con un pin de previsualización temporal.
2.  **Crear Waypoint:** Abre directamente el diálogo de creación de waypoint pre-rellenando las coordenadas exactas de la búsqueda.

---

## 📐 3. Dibujo y Medición de Áreas (Polígonos)

Diseñada para cálculos agrarios, delimitación de zonas de acampada permitida o mapeo de parcelas forestales, esta herramienta calcula áreas y perímetros sobre la elipsoide terrestre.

### Trazado e Interacción
1.  Haz clic en el botón de **Dibujo de Área** (icono de hexágono ⬡) en la barra de herramientas.
2.  Tu cursor cambiará a un puntero de precisión (`crosshair`).
3.  Ve marcando los vértices del polígono en sentido horario o antihorario sobre el mapa.
4.  Para cerrar el polígono, haz **doble clic** en cualquier punto o haz clic sobre el **primer vértice** (que parpadeará con una animación especial para facilitar el cierre).

### Métricas y visualización
*   **Cálculo Geodésico Exacto:** A través de la fórmula de exceso esférico basada en el elipsoide WGS84, el sistema calcula de forma precisa el área (en metros cuadrados `m²` y hectáreas `ha`) y el perímetro (en metros `m` o kilómetros `km`), evitando la deformación de la proyección Mercator.
*   **Etiqueta de Centroide:** Cada polígono guarda un marcador invisible en su centroide geométrico donde renderiza una etiqueta flotante traslúcida con el nombre del área, su extensión y perímetro visibles directamente sobre el mapa.
*   **Color Personalizado:** Puedes editar el color del relleno y del borde del polígono en cualquier momento mediante la paleta interactiva de la barra lateral.

---

## 🗂️ 4. Carpetas Unificadas y Buscador de Biblioteca

La biblioteca de SummitGPS implementa un sistema avanzado de gestión que permite unificar todos tus recursos cartográficos bajo un único espacio conceptual de carpeta de campo o proyecto.

### 📁 Carpetas Unificadas (Colecciones)
Una Carpeta Unificada agrupa de manera simultánea e integrada tres tipos de elementos que pertenezcan a la misma zona o expedición:
*   📐 **Rutas:** Tracks grabados o diseñados.
*   📍 **Marcas:** Waypoints e hitos geográficos de interés.
*   ⬡ **Áreas:** Polígonos y perímetros acotados.

#### Funciones de Carpeta Avanzadas:
*   **Sincronización Espejo:** Para garantizar compatibilidad absoluta con bases de datos relacionales sin migraciones destructivas, la creación de una Carpeta Unificada duplica de forma inteligente el identificador ID tanto en colecciones de rutas como en grupos de marcas. Esto permite que los elementos coexistan bajo la misma carpeta física en la UI de forma 100% transparente.
*   **Ojo de Visibilidad Global:** Apaga o enciende instantáneamente todas las rutas, marcas y áreas de una carpeta en el mapa con un solo clic.
*   **Borrado Resiliente:** Si decides eliminar una carpeta que contiene elementos, la aplicación te preguntará de forma proactiva si deseas:
    *   *Conservar elementos:* Elimina la carpeta contenedora y mueve de forma segura todos sus tracks, waypoints y áreas a la raíz global ("Elementos sin carpeta").
    *   *Eliminar todo:* Realiza un borrado en cascada local y en la nube.

### 🔍 Buscador de Biblioteca Premium
Ubicado en la parte superior de la biblioteca, este buscador en tiempo real realiza un filtrado reactivo de alta velocidad sobre todo el árbol de elementos:
*   Filtra rutas, marcas y áreas según coincidencias en su **nombre**, **notas**, **descripciones** o **enlaces**.
*   **Auto-Expansión Inteligente:** Si un elemento coincidente se encuentra dentro de una carpeta que actualmente está colapsada, el buscador expandirá automáticamente dicha carpeta y aplicará una animación de foco sobre el elemento coincidente.
*   Si borras la búsqueda, las carpetas y listas regresarán a su estado de colapso y orden original de forma suave.

---

## 🖨️ 5. Herramienta de Impresión Cartográfica Profesional

No te fíes solo de la tecnología digital. La montaña requiere seguridad offline. SummitGPS incorpora una herramienta de composición e impresión cartográfica avanzada que genera hojas de mapa físicas de calidad editorial.

### Configuración de la Impresión
Al hacer clic en el botón de impresión (icono de impresora 🖨️), se abrirá un lienzo de previsualización que replica de forma exacta el resultado impreso. Puedes configurar:
*   **Formatos normalizados de papel:** A4, Letter o A3.
*   **Orientación:** Horizontal (Landscape) o Vertical (Portrait).
*   **Encuadre exacto:** Desplaza e interactúa con el mapa dentro de la ventana de previsualización para definir el encuadre exacto del territorio que necesitas en tu mapa de papel.

### Elementos Cartográficos de Alta Definición
El lienzo de SummitGPS añade automáticamente sobre el mapa capas de edición que no interfieren con la navegación web:
1.  **Caja de Título:** Un panel elegante en la esquina superior que muestra el nombre del mapa (personalizable por el usuario), la fecha actual del sistema, las coordenadas centrales y el huso UTM activo.
2.  **Brújula y Aguja del Norte:** Un puntero minimalista que señala con precisión la orientación cartográfica para facilitar el uso de brújula analógica sobre el papel.
3.  **Leyenda de Vector de Ruta:** Una tarjeta suspendida que muestra el perfil de la ruta activa con sus colores correspondientes, la distancia total y los desniveles acumulados.
4.  **Barra de Escala Gráfica Dinámica:** Un tick cartográfico dinámico (ej. `0 | 250 m | 500 m`) que calcula mediante trigonometría el factor de escala real en el centro del papel según el zoom exacto del encuadre. ¡Crucial para medir distancias reales sobre papel con escalímetro!

### Exportación
*   **PNG de Alta Definición:** Captura todo el canvas del mapa a resolución nativa doble (2x DPI) a través del motor `html2canvas-pro` para conservar la nitidez de curvas de nivel y senderos finos.
*   **PDF Cartográfico:** Genera un documento PDF perfectamente escalado utilizando `jspdf`, listo para enviar a imprenta o llevar en tu móvil en modo de visualización sin conexión.

---

## 🗺️ 6. Capas Cartográficas y Lectura del Terreno

### Capas Base Disponibles
*   **OpenStreetMap (OSM) Estándar:** Excelente mapa urbano y de carreteras secundarias global.
*   **Satélite Global:** Fotografía aérea de alta resolución para identificar vegetación, pedreras, neveros y pasos rocosos reales.
*   **IGN Topográfico España:** Cartografía oficial detallada de España con senderos homologados, fuentes y nombres de parajes locales (Toponimia fina).

### Superposiciones Cartográficas Avanzadas
*   **Cuadrícula de Coordenadas Superpuesta:** Dibuja cuadrículas en tiempo real sobre el mapa (UTM, DMS o Lat/Lng Decimal). El sistema adapta el tamaño del grid al zoom y renderiza etiquetas de texto legibles con las coordenadas en los márgenes del mapa.
*   **Curvas de Nivel e Isolíneas (Elevación Topo):** Activa una capa vectorial transparente de isolíneas de relieve. Dispone de un deslizador de opacidad en la barra lateral para ajustar el contraste de las curvas de nivel sobre el mapa base satelital.

---

## 🌤️ 7. Clima y Consulta en el Terreno

Haciendo un clic simple sobre cualquier punto del mapa en modo de exploración activa se activa la consola meteorológica y geodésica de SummitGPS:

*   **Elevación Geodésica Directa:** Consulta la altitud exacta sobre el nivel del mar en metros del punto clicked.
*   **Geocodificación Inversa:** Obtiene la dirección postal más cercana o el nombre geográfico del paraje o montaña.
*   **Amanecer / Atardecer (Orto y Ocaso):** Calcula el horario solar exacto para ese punto geográfico específico en la fecha actual. Vital para planificar el fin de actividad antes de la noche.
*   **Consola del Clima:** Renderiza en tiempo real:
    *   Condiciones climáticas actuales (temperatura, viento, humedad, estado del cielo).
    *   Previsión especial para la noche.
    *   **Previsión extendida a 7 días** con iconos visuales de temperatura mínima y máxima para planificar expediciones de larga duración de forma segura.

---

## 🔐 8. Cuenta, Sincronización y Resiliencia Local

### Modo de Usuario Sincronizado
Al registrarte e iniciar sesión con tu cuenta de email o Google:
*   Todos tus tracks, waypoints, retos, áreas y configuraciones se sincronizan de forma transparente con la base de datos **Supabase**.
*   Podrás acceder a tus datos de forma instantánea desde cualquier dispositivo (móvil, tablet, PC).
*   Se habilitará el almacenamiento ilimitado de fotografías de waypoints en la nube.

### Modo Invitado (Persistencia Local Resiliente)
Si prefieres utilizar SummitGPS de forma anónima, rápida y sin registros:
*   La aplicación cuenta con un fallback inteligente que intercepta todas las llamadas y almacena tus rutas, waypoints, grupos y áreas de forma local utilizando `localStorage`.
*   Tus datos persistirán indefinidamente en tu navegador, incluso si refrescas la pestaña o cierras el navegador.
*   **Compatibilidad offline:** Si sales al campo sin conexión, toda tu biblioteca local seguirá estando disponible para consulta y edición en el navegador.

---

## ⌨️ 9. Consejos de Seguridad para Actividades de Montaña

> [!WARNING]
> Ninguna aplicación móvil o cartografía digital sustituye a la planificación prudente, el equipo técnico necesario y el sentido común en la montaña.

1.  **Lleva siempre papel:** Antes de salir, utiliza nuestra **Herramienta de Impresión Cartográfica** para imprimir tu ruta en papel de alta definición. Métela en una funda impermeable y llévala junto con una brújula física.
2.  **Baterías y frío:** Las baterías de los smartphones se descargan de forma extremadamente rápida a temperaturas bajo cero. Lleva siempre el teléfono cargado al 100%, una batería externa (Powerbank) en un bolsillo interior templado por tu calor corporal, y activa el modo de ahorro de energía.
3.  **Consulta el clima y el orto/ocaso:** Revisa la previsión a 7 días en el punto exacto de la ruta y apunta la hora del atardecer. Planifica tu itinerario de forma que te queden al menos 2 horas de luz de margen de seguridad antes del ocaso.
4.  **Informa de tu ruta:** Deja dicho a familiares, amigos o en el refugio de montaña más cercano el itinerario exacto que vas a realizar, los colores de tu equipación y la hora estimada de regreso.
