import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons broken by webpack/vite bundling
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapPickerProps {
  /** Called when user clicks the map or drags the pin */
  onPinDrop: (lat: number, lng: number) => void;
  /** Initial pin position (optional) */
  initialLat?: number;
  initialLng?: number;
}

// Dubai centre as default
const DEFAULT_LAT = 25.2048;
const DEFAULT_LNG = 55.2708;
const DEFAULT_ZOOM = 11;

export function MapPicker({ onPinDrop, initialLat, initialLng }: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  // Keep a stable ref to onPinDrop so event listeners never capture a stale closure
  const onPinDropRef = useRef(onPinDrop);
  useEffect(() => { onPinDropRef.current = onPinDrop; }, [onPinDrop]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const startLat = initialLat ?? DEFAULT_LAT;
    const startLng = initialLng ?? DEFAULT_LNG;

    // Initialise map
    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    // CartoDB Voyager tiles — free, no API key, always renders labels in English
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20,
    }).addTo(map);

    // If initial coords provided, place a marker immediately
    if (initialLat && initialLng) {
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onPinDropRef.current(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }

    // Click anywhere to drop/move pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onPinDropRef.current(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      onPinDropRef.current(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker if external coords change (e.g. from GPS)
  useEffect(() => {
    if (!mapRef.current || !initialLat || !initialLng) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([initialLat, initialLng]);
    } else {
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapRef.current);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onPinDropRef.current(pos.lat, pos.lng);
      });
      markerRef.current = marker;
    }
    mapRef.current.setView([initialLat, initialLng], 15);
  }, [initialLat, initialLng]); // onPinDrop intentionally omitted — we use the ref

  return (
    <div
      ref={mapContainerRef}
      className="w-full rounded-xl overflow-hidden border border-border"
      style={{ height: "300px" }}
    />
  );
}
