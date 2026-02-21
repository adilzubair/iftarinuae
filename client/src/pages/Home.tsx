import { useState } from "react";
import { usePlaces } from "@/hooks/use-places";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, Navigation, X, MapPin, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { PlaceWithDistance } from "@shared/schema";

export default function Home() {
  const { data: places, isLoading, error } = usePlaces();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceWithDistance[] | null>(null);
  const [isFindingNearest, setIsFindingNearest] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const { toast } = useToast();

  // Detect iOS (Safari/Chrome on iPhone/iPad) for tailored instructions
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const showPermissionDeniedHelp = () => {
    setLocationDenied(true);
    setIsFindingNearest(false);
  };

  const handleFindNearest = async () => {
    setLocationDenied(false);
    setIsFindingNearest(true);
    setSearch("");

    if (!navigator.geolocation) {
      toast({
        title: "Not supported",
        description: "Your browser doesn't support location access.",
        variant: "destructive",
      });
      setIsFindingNearest(false);
      return;
    }

    // Proactively check permission state where the API is available
    // (supported in Chrome/Firefox; not in Safari — we fall through to getCurrentPosition)
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (status.state === "denied") {
          showPermissionDeniedHelp();
          return;
        }
      } catch {
        // permissions API not supported — proceed normally
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`/api/places/nearby?lat=${latitude}&lng=${longitude}`);
          if (!res.ok) throw new Error("Failed to fetch nearby places");
          const data = await res.json();
          setNearbyPlaces(data);
          toast({
            title: "Location found",
            description: `Found ${data.length} places near you.`,
          });
        } catch {
          toast({
            title: "Error",
            description: "Failed to find nearby places. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsFindingNearest(false);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          showPermissionDeniedHelp();
        } else {
          setIsFindingNearest(false);
          toast({
            title: "Location unavailable",
            description: "Unable to get your location. Please try again.",
            variant: "destructive",
          });
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const clearNearby = () => {
    setNearbyPlaces(null);
  };

  const [selectedEmirate, setSelectedEmirate] = useState("All");

  const EMIRATES = [
    "All",
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Umm Al Quwain",
    "Ras Al Khaimah",
    "Fujairah"
  ];

  // Determine which data to display: Nearby places (if active) or filtered standard list
  const activeData = nearbyPlaces || places || [];

  const filteredPlaces = activeData.filter(place => {
    const matchesSearch = place.name.toLowerCase().includes(search.toLowerCase()) || 
                          place.location.toLowerCase().includes(search.toLowerCase());
    
    // Near Me overrides Emirate filter
    if (nearbyPlaces) return matchesSearch;

    if (selectedEmirate === "All") return matchesSearch;
    
    // --- Hybrid Filter Logic (Text + Coordinates) ---

    // 1. Text Check
    const searchString = (place.location + " " + (place.description || "")).toLowerCase();
    const emirateLower = selectedEmirate.toLowerCase();
    const matchesText = searchString.includes(emirateLower);

    // 2. Coordinate Check (Approximate bounding boxes for cases where text is missing)
    let matchesCoordinates = false;
    const lat = parseFloat(place.latitude || "0");
    const lng = parseFloat(place.longitude || "0");

    if (lat && lng) {
      switch (selectedEmirate) {
        case "Abu Dhabi":
          // Broad AD check: Lat < 24.6 (City & Western Region) or Long < 54.8 (avoiding Dubai border)
          // Sheikh Zayed Mosque is at ~24.4, 54.4
          matchesCoordinates = lat < 24.65 || (lat < 24.9 && lng < 54.9);
          break;
        case "Dubai":
          // Roughly 24.7 to 25.35, Long 54.9 to 55.6
          // Excludes Sharjah which is mostly North/East of 25.3
          matchesCoordinates = lat >= 24.7 && lat < 25.35 && lng >= 54.9 && lng < 55.6;
          break;
        case "Sharjah":
          // Just north of Dubai: 25.35 to 25.45 (City), plus enclaves (hard to map perfectly)
          matchesCoordinates = lat >= 25.28 && lat < 25.42 && lng >= 55.35 && lng < 55.8;
          break;
        case "Ajman":
          matchesCoordinates = lat >= 25.38 && lat < 25.45 && lng >= 55.4 && lng < 55.6;
          break;
        case "Umm Al Quwain":
          matchesCoordinates = lat >= 25.48 && lat < 25.65 && lng >= 55.5 && lng < 55.8;
          break;
        case "Ras Al Khaimah":
          matchesCoordinates = lat >= 25.65 && lng < 56.1; // North of UAQ
          break;
        case "Fujairah":
          matchesCoordinates = lng >= 56.1; // East Coast
          break;
      }
    }
    
    return matchesSearch && (matchesText || matchesCoordinates);
  });

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <SEO 
        title="IftarInUAE - Find the Best Iftar Places"
        description="Discover top-rated Iftar places and traditional tents across UAE for Ramadan 2026. Find iftar places near you."
      />
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">
          Find the best <span className="text-transparent bg-clip-text bg-gradient-to-r from-uae-red to-uae-green">Iftar</span> spots
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Discover trusted places for Iftar in the UAE, shared by the community.
        </p>

        <div className="relative max-w-md mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name or location..."
              className="pl-10 h-12 rounded-full border-border/60 shadow-sm focus-visible:ring-offset-0"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (nearbyPlaces) setNearbyPlaces(null); // Reset nearby if user searches manually
              }}
            />
          </div>
          <Button
            className={`h-12 rounded-full shrink-0 shadow-sm px-5 gap-2 font-medium border transition-all ${
              nearbyPlaces
                ? "bg-uae-red/10 text-uae-red border-uae-red/30 hover:bg-uae-red/20"
                : "bg-background text-foreground border-border/60 hover:bg-secondary"
            }`}
            variant="ghost"
            onClick={nearbyPlaces ? clearNearby : handleFindNearest}
            disabled={isFindingNearest}
          >
            {isFindingNearest ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Finding...</>
            ) : nearbyPlaces ? (
              <><X className="w-4 h-4" />Clear</>
            ) : (
              <><Navigation className="w-4 h-4" />Near Me</>
            )}
          </Button>
        </div>
        {nearbyPlaces && (
           <p className="text-sm text-uae-green mt-2 font-medium animate-in fade-in slide-in-from-top-1">
             📍 Showing places closest to you
           </p>
        )}

        {/* Location permission denied — inline help card */}
        <AnimatePresence>
          {locationDenied && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="mt-3 bg-uae-red/5 border border-uae-red/20 rounded-2xl p-4 text-left relative"
            >
              <button
                type="button"
                onClick={() => setLocationDenied(false)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-uae-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Location access is blocked
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Your browser previously denied location access. To enable it:
                  </p>

                  {isIOS ? (
                    <ol className="text-xs text-foreground space-y-1 list-decimal list-inside">
                      <li>Open the <strong>Settings</strong> app on your iPhone</li>
                      <li>Scroll down and tap <strong>Safari</strong> (or <strong>Chrome</strong>)</li>
                      <li>Tap <strong>Location</strong> → select <strong>Ask</strong> or <strong>Allow</strong></li>
                      <li>Come back here and tap <strong>Near Me</strong> again</li>
                    </ol>
                  ) : (
                    <ol className="text-xs text-foreground space-y-1 list-decimal list-inside">
                      <li>Tap the <strong>lock icon</strong> in your browser's address bar</li>
                      <li>Tap <strong>Permissions</strong> → <strong>Location</strong> → <strong>Allow</strong></li>
                      <li>Refresh the page and tap <strong>Near Me</strong> again</li>
                    </ol>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>

      {/* Emirate Filter Tabs - hidden if "Near Me" is active */}
      {!nearbyPlaces && (
        <div className="mb-8 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {EMIRATES.map((emirate) => (
              <button
                key={emirate}
                onClick={() => setSelectedEmirate(emirate)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  selectedEmirate === emirate
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                }`}
              >
                {emirate}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold font-display">
          {nearbyPlaces 
            ? 'Nearest Places' 
            : search 
              ? 'Search Results' 
              : selectedEmirate !== 'All' 
                ? `${selectedEmirate} Spots` 
                : 'All Popular Places'}
        </h2>
        <Link href="/add">
          <Button className="rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Add Place
          </Button>
        </Link>
      </div>

      {isLoading && !nearbyPlaces ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Finding the best spots...</p>
        </div>
      ) : error && !nearbyPlaces ? (
        <div className="text-center py-20 text-destructive">
          <p>Failed to load places. Please try again later.</p>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="text-center py-20 bg-secondary/30 rounded-3xl border border-dashed border-border px-4">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {selectedEmirate !== "All" && !search 
              ? `No spots in ${selectedEmirate} yet` 
              : "No places found"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            {search 
              ? "Try adjusting your search terms." 
              : selectedEmirate !== "All"
                ? `Be the first to share an Iftar spot in ${selectedEmirate}! Your contribution helps the community.`
                : "Be the first to share an Iftar spot!"}
          </p>
          {search ? (
            <Button variant="outline" onClick={() => setSearch("")}>Clear Search</Button>
          ) : (
            <Link href="/add">
              <Button>Add a Place in {selectedEmirate !== "All" ? selectedEmirate : ""}</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaces.map((place, i) => (
            <PlaceCard key={place.id} place={place} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
