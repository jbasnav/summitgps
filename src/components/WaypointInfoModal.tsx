import { useState, useEffect } from "react";
import type { Waypoint } from "../hooks/useRoutePlanner";

interface WikiArticle {
  pageid: number;
  title: string;
  snippet: string;
  lat: number;
  lon: number;
  dist: number;
}

interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop: { page: string } };
}

interface WaypointInfoModalProps {
  isOpen: boolean;
  waypoint: Waypoint | null;
  onClose: () => void;
}

export function WaypointInfoModal({ isOpen, waypoint, onClose }: WaypointInfoModalProps) {
  const [articles, setArticles] = useState<WikiArticle[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !waypoint) return;
    setArticles([]);
    setSelectedSummary(null);
    setError(null);
    setLoading(true);

    const lang = navigator.language.startsWith("es") ? "es" : "en";
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${waypoint.lat}|${waypoint.lng}&gsradius=20000&gslimit=6&format=json&origin=*`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Wikimedia API response not OK");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error.info || "Wikimedia API error");
        setArticles(data.query?.geosearch || []);
        if (data.query?.geosearch?.length > 0) {
          loadSummary(data.query.geosearch[0].title, lang);
        }
      })
      .catch((err) => {
        console.error("Failed to load wikipedia search results:", err);
        setError("Error al cargar artículos cercanos de Wikipedia. Por favor comprueba tu conexión.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, waypoint]);

  function loadSummary(title: string, lang?: string) {
    const l = lang || (navigator.language.startsWith("es") ? "es" : "en");
    setSummaryLoading(true);
    setSelectedSummary(null);
    setSummaryError(null);
    fetch(`https://${l}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Wikimedia REST API response not OK");
        return r.json();
      })
      .then((data) => setSelectedSummary(data))
      .catch((err) => {
        console.error("Failed to load wikipedia article summary:", err);
        setSummaryError("Error al cargar la descripción de Wikipedia.");
      })
      .finally(() => setSummaryLoading(false));
  }

  if (!isOpen || !waypoint) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0c120f] border border-[#1b3d2b] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b3d2b]">
          <div>
            <h2 className="text-slate-100 font-bold text-base">{waypoint.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
              {waypoint.elevation !== undefined && ` · ${Math.round(waypoint.elevation)} m`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col overflow-hidden flex-1">
          {/* Article list */}
          <div className="px-4 py-3 border-b border-[#1b3d2b]">
            <p className="text-slate-400 text-xs mb-2">Lugares cercanos en Wikipedia</p>
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Buscando...
              </div>
            )}
            {!loading && error && (
              <p className="text-red-400 text-[11px] py-1.5">{error}</p>
            )}
            {!loading && !error && articles.length === 0 && (
              <p className="text-slate-500 text-xs py-2">No se encontraron artículos cercanos.</p>
            )}
            {!loading && !error && articles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {articles.map((a) => (
                  <button
                    key={a.pageid}
                    onClick={() => loadSummary(a.title)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedSummary?.title === a.title
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "bg-[#131b17] border-[#1b3d2b] text-slate-300 hover:bg-[#1b3d2b] hover:text-white"
                    }`}
                  >
                    {a.title}
                    <span className="ml-1 text-slate-500">{(a.dist / 1000).toFixed(1)} km</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {summaryLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4 justify-center">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Cargando artículo...
              </div>
            )}
            {!summaryLoading && summaryError && (
              <p className="text-red-400 text-xs py-4 text-center">{summaryError}</p>
            )}
            {!summaryLoading && !summaryError && selectedSummary && (
              <div className="space-y-3">
                {selectedSummary.thumbnail?.source && (
                  <img
                    src={selectedSummary.thumbnail.source}
                    alt={selectedSummary.title}
                    className="w-full max-h-40 object-cover rounded-lg border border-[#1b3d2b]"
                  />
                )}
                <h3 className="text-slate-100 font-semibold text-sm">{selectedSummary.title}</h3>
                <p className="text-slate-300 text-xs leading-relaxed">{selectedSummary.extract}</p>
                {selectedSummary.content_urls?.desktop?.page && (
                  <a
                    href={selectedSummary.content_urls.desktop.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Ver en Wikipedia
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
