import type { RoutePoint } from "../hooks/useRoutePlanner";

// Fórmulas para calcular x, y de teselas a partir de lat, lng y zoom (Mercator esférica)
export function latLngToTile(lat: number, lng: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z: zoom };
}

const TILE_LAYERS: Record<string, string> = {
  osm: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
  opentopo: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  cyclosm: "https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
  wanderreitkarte: "https://www.wanderreitkarte.de/topo/{z}/{x}/{y}.png",
  "tf-outdoors": "https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey={tf_key}",
  "tf-transport": "https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey={tf_key}",
  "tf-cycle": "https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey={tf_key}",
};

const HILLSHADE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}";

export interface DownloadProgress {
  downloaded: number;
  total: number;
  status: "calculating" | "downloading" | "completed" | "error";
  message: string;
}

/**
 * Calcula todas las teselas únicas para los zooms 12 al 15 que cubren la ruta
 */
export function calculateRouteTiles(points: RoutePoint[]): { x: number; y: number; z: number }[] {
  const tilesSet = new Set<string>();
  const tilesList: { x: number; y: number; z: number }[] = [];
  const zooms = [12, 13, 14, 15];

  if (points.length === 0) return [];

  for (const zoom of zooms) {
    // Determinar el buffer (1 a la redonda para zooms bajos, 0 para zooms altos para limitar el total)
    const buffer = zoom <= 13 ? 1 : 0;

    for (const pt of points) {
      const tile = latLngToTile(pt.lat, pt.lng, zoom);
      
      for (let dx = -buffer; dx <= buffer; dx++) {
        for (let dy = -buffer; dy <= buffer; dy++) {
          const tx = tile.x + dx;
          const ty = tile.y + dy;
          const key = `${zoom}/${tx}/${ty}`;
          
          if (!tilesSet.has(key)) {
            tilesSet.add(key);
            tilesList.push({ x: tx, y: ty, z: zoom });
          }
        }
      }
    }
  }

  return tilesList;
}

/**
 * Descarga las teselas calculadas en lotes para que el Service Worker las cachee
 */
export async function downloadRouteTiles(
  points: RoutePoint[],
  activeBaseLayer: string,
  downloadHillshade: boolean,
  onProgress: (progress: DownloadProgress) => void
): Promise<void> {
  if (points.length === 0) {
    onProgress({
      downloaded: 0,
      total: 0,
      status: "error",
      message: "No hay puntos en la ruta activa.",
    });
    return;
  }

  onProgress({
    downloaded: 0,
    total: 0,
    status: "calculating",
    message: "Calculando teselas necesarias...",
  });

  const tiles = calculateRouteTiles(points);
  const tfKey = localStorage.getItem("summit_thunderforest_key") || "";

  // Generar URLs para las capas seleccionadas
  const urls: string[] = [];
  const baseTemplate = TILE_LAYERS[activeBaseLayer] || TILE_LAYERS.osm;

  for (const tile of tiles) {
    // URL capa base
    let url = baseTemplate
      .replace("{z}", tile.z.toString())
      .replace("{x}", tile.x.toString())
      .replace("{y}", tile.y.toString())
      .replace("{s}", "a")
      .replace("{tf_key}", tfKey);
    urls.push(url);

    // URL hillshading si está activo
    if (downloadHillshade) {
      const hillshadeUrl = HILLSHADE_URL
        .replace("{z}", tile.z.toString())
        .replace("{x}", tile.x.toString())
        .replace("{y}", tile.y.toString());
      urls.push(hillshadeUrl);
    }
  }

  const total = urls.length;
  if (total === 0) {
    onProgress({
      downloaded: 0,
      total: 0,
      status: "completed",
      message: "Descarga completada (0 teselas necesarias).",
    });
    return;
  }

  onProgress({
    downloaded: 0,
    total,
    status: "downloading",
    message: `Descargando 0 de ${total} teselas...`,
  });

  let downloaded = 0;
  const CONCURRENCY_LIMIT = 8;
  const executing: Promise<void>[] = [];

  for (const url of urls) {
    const p = fetch(url, { cache: "reload" })
      .then(() => {})
      .catch((err) => {
        console.warn(`Failed to cache tile URL: ${url}`, err);
      })
      .finally(() => {
        downloaded++;
        onProgress({
          downloaded,
          total,
          status: "downloading",
          message: `Descargando ${downloaded} de ${total} teselas...`,
        });
        // Eliminar del array de ejecución cuando termine
        const index = executing.indexOf(p);
        if (index > -1) {
          executing.splice(index, 1);
        }
      });

    executing.push(p);

    if (executing.length >= CONCURRENCY_LIMIT) {
      await Promise.race(executing);
    }
  }

  // Esperar a que terminen las peticiones pendientes
  await Promise.all(executing);

  onProgress({
    downloaded: total,
    total,
    status: "completed",
    message: `¡Descarga de ${total} teselas finalizada con éxito!`,
  });
}
