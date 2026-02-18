import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Navigation, AlertCircle, Search, Map } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Lazy-load the heavy Leaflet map so it doesn't bloat the initial bundle
const MapPicker = lazy(() =>
  import("./MapPicker").then((m) => ({ default: m.MapPicker }))
);

interface LocationData {
  address: string;
  latitude: string;
  longitude: string;
}

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  onLocationFetched?: (data: LocationData) => void;
  placeholder?: string;
}

interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    osm_type?: string;
    type?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
}

interface NominatimForwardResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
  address: {
    amenity?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface NominatimReverseResponse {
  display_name: string;
  address: {
    amenity?: string;
    road?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

/** A normalised search result from either API */
interface SearchResult {
  label: string;      // Primary display text
  sublabel: string;   // Secondary display text (area, city)
  typeLabel: string;  // Human-readable type (Neighbourhood, Mosque, etc.)
  lat: number;
  lng: number;
}

type Tab = "search" | "map" | "gps";

// Photon bounding box — used as a soft bias hint, not a hard filter
const PHOTON_BBOX = "51.5,22.6,56.4,26.1";

// Required by Nominatim ToS: https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_HEADERS = {
  "Accept-Language": "en",
  "User-Agent": "IftarInUAE/1.0 (https://iftarinuae.com)",
};

/** Validate that a coordinate pair is a real, finite number in a sane global range */
function isValidCoord(lat: number, lng: number): boolean {
  return (
    isFinite(lat) && isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

/** Truncate and strip control characters from external API strings */
function sanitiseAddress(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 300);
}

/** Map OSM class/type to a friendly label shown under each result */
function friendlyType(cls: string, type: string): string {
  const key = `${cls}/${type}`;
  const map: Record<string, string> = {
    "place/neighbourhood": "Neighbourhood",
    "place/suburb": "Area",
    "place/quarter": "District",
    "place/city_district": "District",
    "place/city": "City",
    "place/town": "Town",
    "place/village": "Village",
    "amenity/restaurant": "Restaurant",
    "amenity/cafe": "Café",
    "amenity/fast_food": "Fast Food",
    "amenity/place_of_worship": "Mosque / Place of Worship",
    "amenity/mosque": "Mosque",
    "amenity/school": "School",
    "amenity/hospital": "Hospital",
    "amenity/mall": "Mall",
    "shop/mall": "Mall",
    "shop/supermarket": "Supermarket",
    "leisure/park": "Park",
    "tourism/hotel": "Hotel",
    "tourism/attraction": "Attraction",
    "highway/residential": "Street",
    "highway/primary": "Road",
    "highway/secondary": "Road",
    "highway/tertiary": "Road",
    "highway/service": "Road",
  };
  return map[key] ?? map[`amenity/${type}`] ?? map[`place/${type}`] ?? cls.charAt(0).toUpperCase() + cls.slice(1);
}

/** Build a SearchResult from a Nominatim forward result */
function fromNominatim(r: NominatimForwardResult): SearchResult | null {
  const lat = parseFloat(r.lat);
  const lng = parseFloat(r.lon);
  if (!isValidCoord(lat, lng)) return null;

  const a = r.address;
  // Primary label: most specific named part
  const label = sanitiseAddress(
    a.amenity ?? a.road ?? a.neighbourhood ?? a.suburb ?? a.city_district ?? r.display_name.split(",")[0]
  );
  // Sublabel: area + city
  const subParts = [a.suburb ?? a.city_district ?? a.neighbourhood, a.city ?? a.state].filter(Boolean) as string[];
  const sublabel = sanitiseAddress(subParts.join(", "));

  return { label, sublabel, typeLabel: friendlyType(r.class, r.type), lat, lng };
}

/** Build a SearchResult from a Photon feature */
function fromPhoton(f: PhotonFeature): SearchResult | null {
  const [lng, lat] = f.geometry.coordinates;
  if (!isValidCoord(lat, lng)) return null;
  const p = f.properties;
  const label = sanitiseAddress(p.name ?? p.street ?? "Unknown");
  const subParts = [p.city ?? p.state].filter(Boolean) as string[];
  const sublabel = sanitiseAddress(subParts.join(", "));
  const typeLabel = friendlyType(p.osm_type ?? "", p.type ?? "");
  return { label, sublabel, typeLabel, lat, lng };
}

/** Deduplicate results that are within ~200 m of each other (keep first occurrence) */
function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const out: SearchResult[] = [];
  for (const r of results) {
    const tooClose = out.some((o) => {
      const dLat = (r.lat - o.lat) * 111000;
      const dLng = (r.lng - o.lng) * 111000 * Math.cos((r.lat * Math.PI) / 180);
      return Math.sqrt(dLat * dLat + dLng * dLng) < 200;
    });
    if (!tooClose) out.push(r);
  }
  return out.slice(0, 8);
}

export function LocationPicker({
  value,
  onChange,
  onLocationFetched,
  placeholder = "e.g. Downtown Dubai, near Burj Khalifa",
}: LocationPickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Map tab state
  const [mapLat, setMapLat] = useState<number | undefined>();
  const [mapLng, setMapLng] = useState<number | undefined>();
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Confirmed location display
  const [confirmedAddress, setConfirmedAddress] = useState<string>("");

  const notifyLocation = (data: LocationData) => {
    onChange(data.address);
    setConfirmedAddress(data.address);
    onLocationFetched?.(data);
    setError(null);
  };

  // ── Search tab: dual-API search (Nominatim forward + Photon) ─────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    // Cancel any in-flight requests
    if (searchAbortRef.current) searchAbortRef.current.abort();

    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);

      try {
        // Fire both APIs in parallel
        const nominatimUrl =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(q)}` +
          `&format=json&addressdetails=1&limit=6` +
          `&countrycodes=ae` +
          `&accept-language=en`;

        const photonUrl =
          `https://photon.komoot.io/api/` +
          `?q=${encodeURIComponent(q)}` +
          `&limit=5&bbox=${PHOTON_BBOX}&lang=en`;

        const [nominatimRes, photonRes] = await Promise.allSettled([
          fetch(nominatimUrl, { signal: controller.signal, headers: NOMINATIM_HEADERS }),
          fetch(photonUrl,    { signal: controller.signal }),
        ]);

        const nominatimResults: SearchResult[] = [];
        if (nominatimRes.status === "fulfilled" && nominatimRes.value.ok) {
          const data: NominatimForwardResult[] = await nominatimRes.value.json();
          for (const r of data) {
            const sr = fromNominatim(r);
            if (sr) nominatimResults.push(sr);
          }
        }

        const photonResults: SearchResult[] = [];
        if (photonRes.status === "fulfilled" && photonRes.value.ok) {
          const data = await photonRes.value.json();
          for (const f of (data.features ?? []) as PhotonFeature[]) {
            const sr = fromPhoton(f);
            if (sr) photonResults.push(sr);
          }
        }

        // Nominatim first (better for areas/streets), then Photon (better for POI names)
        const merged = deduplicateResults([...nominatimResults, ...photonResults]);
        setSearchResults(merged);
      } catch (err: any) {
        if (err?.name !== "AbortError") setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const handleSearchSelect = (result: SearchResult) => {
    const address = sanitiseAddress(`${result.label}${result.sublabel ? ", " + result.sublabel : ""}`);
    setSearchQuery(result.label);
    setSearchResults([]);
    notifyLocation({ address, latitude: result.lat.toString(), longitude: result.lng.toString() });
  };

  // ── Map tab: Nominatim reverse geocode on pin drop ───────────────────────
  const handlePinDrop = async (lat: number, lng: number) => {
    setMapLat(lat);
    setMapLng(lng);
    setIsReverseGeocoding(true);
    setError(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: NOMINATIM_HEADERS }
      );
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data: NominatimReverseResponse = await res.json();

      const parts: string[] = [];
      if (data.address.amenity) parts.push(data.address.amenity);
      if (data.address.road) parts.push(data.address.road);
      if (data.address.suburb) parts.push(data.address.suburb);
      if (data.address.city) parts.push(data.address.city);
      if (data.address.state) parts.push(data.address.state);

      const address = sanitiseAddress(parts.length > 0 ? parts.join(", ") : data.display_name);
      notifyLocation({ address, latitude: lat.toString(), longitude: lng.toString() });
    } catch {
      // Still save coords even if reverse geocode fails — coords are already validated
      notifyLocation({
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        latitude: lat.toString(),
        longitude: lng.toString(),
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // ── GPS tab: existing logic ───────────────────────────────────────────────
  const fetchGpsLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: NOMINATIM_HEADERS }
          );
          if (!res.ok) throw new Error("Failed to fetch address");
          const data: NominatimReverseResponse = await res.json();

          const parts: string[] = [];
          if (data.address.amenity) parts.push(data.address.amenity);
          if (data.address.road) parts.push(data.address.road);
          if (data.address.suburb) parts.push(data.address.suburb);
          if (data.address.city) parts.push(data.address.city);
          if (data.address.state) parts.push(data.address.state);

          const address = sanitiseAddress(parts.length > 0 ? parts.join(", ") : data.display_name);
          notifyLocation({ address, latitude: latitude.toString(), longitude: longitude.toString() });

          // Sync map pin if user switches to map tab
          setMapLat(latitude);
          setMapLng(longitude);
        } catch {
          setError("Failed to get address. Please try again.");
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setIsLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please enable it in your browser settings.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location unavailable. Please try again.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out. Please try again.");
            break;
          default:
            setError("An error occurred getting your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "search", label: "Search", icon: <Search className="w-3.5 h-3.5" /> },
    { id: "map", label: "Map Pin", icon: <Map className="w-3.5 h-3.5" /> },
    { id: "gps", label: "My Location", icon: <Navigation className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setError(null); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
              activeTab === tab.id
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground z-10" />
            <Input
              placeholder="Type the place name or address…"
              className="pl-9 h-12 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => {
                const name = searchQuery.trim();
                if (name) notifyLocation({ address: name, latitude: "", longitude: "" });
              }}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-2 px-1">
              💡 Use the <strong>Map Pin</strong> tab to pin the exact location on the map.
            </p>

            {/* 
              ── Search autocomplete (temporarily disabled) ──────────────────
              The Photon + Nominatim search was returning incomplete results for
              UAE locations. Re-enable once a better search solution is in place.

              {isSearching && (
                <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-muted-foreground" />
              )}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
                  >
                    {searchResults.map((result, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSearchSelect(result)}
                        className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 last:border-0"
                      >
                        <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium leading-snug truncate">{result.label}</span>
                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">{result.typeLabel}</span>
                          </div>
                          {result.sublabel && (
                            <span className="text-xs text-muted-foreground truncate block mt-0.5">{result.sublabel}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            */}
          </motion.div>
        )}

        {activeTab === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground px-1">
              Click anywhere on the map to drop a pin. You can drag the pin to adjust.
            </p>
            <Suspense
              fallback={
                <div className="w-full h-[300px] rounded-xl bg-secondary/30 flex items-center justify-center border border-border">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <MapPicker
                onPinDrop={handlePinDrop}
                initialLat={mapLat}
                initialLng={mapLng}
              />
            </Suspense>
            {isReverseGeocoding && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Getting address…
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "gps" && (
          <motion.div
            key="gps"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              type="button"
              variant="secondary"
              className="w-full h-12 rounded-xl gap-2 font-medium"
              onClick={fetchGpsLocation}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching your location…
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Use My Current Location
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your browser will ask for permission to access your location.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmed location pill */}
      <AnimatePresence>
        {confirmedAddress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2.5 rounded-xl border border-primary/20"
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate font-medium">{confirmedAddress}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
