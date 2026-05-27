import React from "react";
import { renderToString } from "react-dom/server";
import {
  MapPin, Tent, Camera, AlertTriangle, Info, Droplet, Trophy, Trees, Waves, Flame,
  Binoculars, Home, Car, Heart, Compass, Flag, Map, Footprints, TreePine,
  TreeDeciduous, Flower, Bird, Fish, Snowflake, Wind, Thermometer, Activity,
  Target, Bike, Milestone, CableCar, Bus, Train, Fuel, Wrench, Bed,
  Utensils, Coffee, ShoppingBag, Trash2, Wifi, Plug, Star, Sun, Moon,
  ShieldAlert, Umbrella, CloudRain, Sunset, Sunrise, Navigation,
  Crown, Award, HeartPulse, Sparkles, AlertCircle, Locate, Grid, Layers, Settings,
  User, Image, Video, Briefcase, Key, Hammer, Crosshair, BookOpen, Plane, Ship,
  BaggageClaim, Leaf, MountainSnow, Skull, Bug, Cloud, CloudSnow, CloudSun,
  CloudLightning, CloudDrizzle, Shrub, Sprout, Palmtree, Biohazard, Stethoscope, LifeBuoy,
  Megaphone, Siren, MapPinOff, BatteryCharging, BatteryFull, Package,
  ClipboardList, Construction, Scale, Dumbbell, Sword, Swords, Shield, Gamepad2,
  Dice5, Clock, Search, Lock, Unlock, Play, Square, Circle, Triangle
} from "lucide-react";

// Categorized icons library with Lucide components
export const WAYPOINT_CATEGORIES = [
  {
    id: "basic",
    name: "Básico",
    emoji: "📌",
    icons: [
      { value: "mountain", label: "Cima / Pico", icon: MapPin },
      { value: "camp", label: "Campamento", icon: Tent },
      { value: "camera", label: "Fotografía", icon: Camera },
      { value: "danger", label: "Peligro", icon: AlertTriangle },
      { value: "info", label: "Información", icon: Info },
      { value: "water", label: "Agua / Fuente", icon: Droplet },
      { value: "trophy", label: "Reto / Meta", icon: Trophy },
      { value: "favorite", label: "Favorito", icon: Heart },
      { value: "star", label: "Estrella", icon: Star },
      { value: "flag", label: "Bandera", icon: Flag },
      { value: "alert-circle", label: "Alerta", icon: AlertCircle },
      { value: "search", label: "Buscar", icon: Search },
      { value: "settings", label: "Ajustes", icon: Settings },
      { value: "clock", label: "Tiempo / Hora", icon: Clock },
    ]
  },
  {
    id: "outdoor",
    name: "Outdoor / Montaña",
    emoji: "🏔️",
    icons: [
      { value: "binoculars", label: "Avistamiento", icon: Binoculars },
      { value: "compass", label: "Brújula", icon: Compass },
      { value: "footprints", label: "Huellas", icon: Footprints },
      { value: "map", label: "Mapa", icon: Map },
      { value: "navigation", label: "Navegación", icon: Navigation },
      { value: "milestone", label: "Hito / Mojón", icon: Milestone },
      { value: "bridge", label: "Puente", icon: Milestone },
      { value: "cable-car", label: "Teleférico", icon: CableCar },
      { value: "mountain-snow", label: "Montaña Nevada", icon: MountainSnow },
      { value: "locate", label: "Localizar", icon: Locate },
      { value: "grid", label: "Cuadrícula", icon: Grid },
      { value: "layers", label: "Capas", icon: Layers },
      { value: "crosshair", label: "Mira", icon: Crosshair },
      { value: "skull", label: "Calavera", icon: Skull },
    ]
  },
  {
    id: "nature",
    name: "Naturaleza / Clima",
    emoji: "🌲",
    icons: [
      { value: "forest", label: "Bosque / Pinos", icon: Trees },
      { value: "lake", label: "Lago / Río", icon: Waves },
      { value: "fire", label: "Fogata / Vivac", icon: Flame },
      { value: "tree-pine", label: "Pino Solo", icon: TreePine },
      { value: "tree-deciduous", label: "Árbol caduco", icon: TreeDeciduous },
      { value: "flower", label: "Flor / Flora", icon: Flower },
      { value: "bird", label: "Ave / Pájaro", icon: Bird },
      { value: "fish", label: "Pesca", icon: Fish },
      { value: "sun", label: "Sol / Mirador", icon: Sun },
      { value: "moon", label: "Luna / Noche", icon: Moon },
      { value: "snowflake", label: "Nieve / Hielo", icon: Snowflake },
      { value: "wind", label: "Viento / Temp", icon: Wind },
      { value: "thermometer", label: "Temperatura", icon: Thermometer },
      { value: "sunset", label: "Atardecer", icon: Sunset },
      { value: "sunrise", label: "Amanecer", icon: Sunrise },
      { value: "umbrella", label: "Paraguas", icon: Umbrella },
      { value: "cloud-rain", label: "Lluvia", icon: CloudRain },
      { value: "cloud", label: "Nube", icon: Cloud },
      { value: "cloud-snow", label: "Nieve", icon: CloudSnow },
      { value: "cloud-sun", label: "Parcialmente nublado", icon: CloudSun },
      { value: "cloud-lightning", label: "Tormenta", icon: CloudLightning },
      { value: "cloud-drizzle", label: "Llovizna", icon: CloudDrizzle },
      { value: "leaf", label: "Hoja", icon: Leaf },
      { value: "bug", label: "Insecto", icon: Bug },
      { value: "shrub", label: "Arbusto", icon: Shrub },
      { value: "sprout", label: "Brote / Planta", icon: Sprout },
      { value: "palm-tree", label: "Palmera", icon: Palmtree },
      { value: "biohazard", label: "Riesgo biológico", icon: Biohazard },
    ]
  },
  {
    id: "sports",
    name: "Deportes",
    emoji: "🚴",
    icons: [
      { value: "bike", label: "Ciclismo", icon: Bike },
      { value: "activity", label: "Actividad", icon: Activity },
      { value: "target", label: "Objetivo", icon: Target },
      { value: "crown", label: "Corona", icon: Crown },
      { value: "award", label: "Premio / Medalla", icon: Award },
      { value: "heart-pulse", label: "Pulso", icon: HeartPulse },
      { value: "sparkles", label: "Especial", icon: Sparkles },
      { value: "dumbbell", label: "Gimnasio / Fuerza", icon: Dumbbell },
      { value: "sword", label: "Espada / Reto", icon: Sword },
      { value: "swords", label: "Combate / Arena", icon: Swords },
      { value: "shield", label: "Escudo / Defensa", icon: Shield },
      { value: "gamepad2", label: "Juego", icon: Gamepad2 },
      { value: "dice5", label: "Dado / Azar", icon: Dice5 },
      { value: "play", label: "Reproducir", icon: Play },
    ]
  },
  {
    id: "services",
    name: "Servicios / Logística",
    emoji: "⛺",
    icons: [
      { value: "home", label: "Refugio / Albergue", icon: Home },
      { value: "car", label: "Aparcamiento", icon: Car },
      { value: "bed", label: "Alojamiento", icon: Bed },
      { value: "utensils", label: "Restaurante", icon: Utensils },
      { value: "coffee", label: "Cafetería / Bar", icon: Coffee },
      { value: "shopping-bag", label: "Tienda / Compra", icon: ShoppingBag },
      { value: "trash", label: "Basura / Contenedor", icon: Trash2 },
      { value: "toilet", label: "Aseos / WC", icon: Droplet },
      { value: "plug", label: "Toma eléctrica", icon: Plug },
      { value: "wifi", label: "Cobertura / Wifi", icon: Wifi },
      { value: "bus", label: "Autobús", icon: Bus },
      { value: "train", label: "Estación Tren", icon: Train },
      { value: "fuel", label: "Combustible", icon: Fuel },
      { value: "wrench", label: "Taller / Reparación", icon: Wrench },
      { value: "first-aid", label: "Primeros Auxilios", icon: ShieldAlert },
      { value: "user", label: "Persona", icon: User },
      { value: "image", label: "Imagen", icon: Image },
      { value: "video", label: "Vídeo", icon: Video },
      { value: "briefcase", label: "Maletín", icon: Briefcase },
      { value: "key", label: "Llave", icon: Key },
      { value: "hammer", label: "Herramientas", icon: Hammer },
      { value: "book-open", label: "Guía / Libro", icon: BookOpen },
      { value: "plane", label: "Aeropuerto", icon: Plane },
      { value: "ship", label: "Puerto / Embarcadero", icon: Ship },
      { value: "baggage-claim", label: "Equipaje", icon: BaggageClaim },
      { value: "stethoscope", label: "Centro Médico", icon: Stethoscope },
      { value: "life-buoy", label: "Salvavidas", icon: LifeBuoy },
      { value: "megaphone", label: "Megáfono", icon: Megaphone },
      { value: "siren", label: "Alarma / Emergencia", icon: Siren },
      { value: "map-pin-off", label: "Ubicación oculta", icon: MapPinOff },
      { value: "battery-charging", label: "Carga batería", icon: BatteryCharging },
      { value: "battery-full", label: "Batería llena", icon: BatteryFull },
      { value: "pocket", label: "Bolsillo", icon: Package },
      { value: "package", label: "Paquete", icon: Package },
      { value: "clipboard-list", label: "Inventario", icon: ClipboardList },
      { value: "construction", label: "Obras", icon: Construction },
      { value: "scale", label: "Báscula", icon: Scale },
      { value: "lock", label: "Cerrar / Seguro", icon: Lock },
      { value: "unlock", label: "Abrir / Libre", icon: Unlock },
      { value: "square", label: "Cuadrado", icon: Square },
      { value: "circle", label: "Círculo", icon: Circle },
      { value: "triangle", label: "Triángulo", icon: Triangle },
    ]
  }
];

// Flat key-value record for Lucide component quick lookups
export const WPT_ICONS: Record<string, React.ComponentType<any>> = {};

// Flat key-value record for rendering Lucide as dynamic SVG string (for Leaflet markers)
const SVG_COMPONENTS: Record<string, React.ComponentType<any>> = {};

WAYPOINT_CATEGORIES.forEach((cat) => {
  cat.icons.forEach((item) => {
    WPT_ICONS[item.value] = item.icon;
    SVG_COMPONENTS[item.value] = item.icon;
  });
});

/**
 * Renders a Lucide icon component to an inline SVG string.
 * This is 100% dynamic and allows using any Lucide React icon inside Leaflet.
 */
export function getIconSvg(iconName: string, className: string = "w-4 h-4 text-white"): string {
  const IconComponent = SVG_COMPONENTS[iconName] || MapPin;
  // Create element and render it directly to string
  try {
    return renderToString(React.createElement(IconComponent, { className }));
  } catch (e) {
    console.error("Failed to render Lucide icon to SVG string:", e);
    // Fallback to basic map pin SVG
    return renderToString(React.createElement(MapPin, { className }));
  }
}
