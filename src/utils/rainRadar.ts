/**
 * RainViewer weather radar API integration utility.
 * Fetches the latest precipitation radar timestamps for dynamic mapping.
 */
export async function fetchRadarTimestamps(): Promise<number[]> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) throw new Error("API response error");
    const data = await res.json();
    if (data && data.radar && Array.isArray(data.radar.past)) {
      return data.radar.past.map((item: any) => item.time);
    }
  } catch (err) {
    console.error("Failed to fetch RainViewer radar timestamps:", err);
  }
  
  return [];
}
