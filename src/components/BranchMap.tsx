import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { mapsUrl } from "../lib/labels";

type Props = {
  latitude: number;
  longitude: number;
  label?: string;
};

export function BranchMap({ latitude, longitude, label }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let map: import("leaflet").Map | null = null;
    let frame = 0;

    void (async () => {
      try {
        const L = (await import("leaflet")).default;

        // Default marker assets under Vite.
        const iconRetinaUrl = (await import("leaflet/dist/images/marker-icon-2x.png")).default;
        const iconUrl = (await import("leaflet/dist/images/marker-icon.png")).default;
        const shadowUrl = (await import("leaflet/dist/images/marker-shadow.png")).default;
        L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

        if (cancelled || !containerRef.current) return;

        const host = containerRef.current;
        const leafletHost = host as HTMLDivElement & { _leaflet_id?: number };
        if (leafletHost._leaflet_id) {
          delete leafletHost._leaflet_id;
          host.replaceChildren();
        }

        map = L.map(host, {
          center: [latitude, longitude],
          zoom: 15,
          scrollWheelZoom: false,
          attributionControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([latitude, longitude]).addTo(map);
        if (label) marker.bindPopup(label);

        frame = requestAnimationFrame(() => map?.invalidateSize());
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (map) {
        map.remove();
        map = null;
      }
      const host = containerRef.current as
        | (HTMLDivElement & { _leaflet_id?: number })
        | null;
      if (host?._leaflet_id) delete host._leaflet_id;
    };
  }, [latitude, longitude, label]);

  if (failed) {
    return (
      <a
        className="meta-row"
        href={mapsUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
      >
        <span>Ver ubicación</span>
        <span className="value">Mapa</span>
      </a>
    );
  }

  return (
    <div
      ref={containerRef}
      className="branch-map"
      role="img"
      aria-label="Ubicación en el mapa"
    />
  );
}
