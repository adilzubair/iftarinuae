import { useState } from "react";
import { usePlaces } from "@/hooks/use-places";
import { PlaceCard } from "@/components/PlaceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Loader2, UtensilsCrossed } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";

export default function Home() {
  const { data: places, isLoading, error } = usePlaces();
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");

  const filteredPlaces = places?.filter(place => 
    place.name.toLowerCase().includes(search.toLowerCase()) || 
    place.location.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 tracking-tight">
          Find the best <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600">Iftar</span> spots
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Discover trusted places for Iftar in the UAE, shared by the community.
        </p>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or location..."
            className="pl-10 h-12 rounded-full border-border/60 shadow-sm focus-visible:ring-offset-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold font-display">
          {search ? 'Search Results' : 'Popular Places'}
        </h2>
        <Link href="/add">
          <Button className="rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <Plus className="w-4 h-4 mr-2" />
            Add Place
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Finding the best spots...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-destructive">
          <p>Failed to load places. Please try again later.</p>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="text-center py-20 bg-secondary/30 rounded-3xl border border-dashed border-border">
          <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">No places found</h3>
          <p className="text-muted-foreground mb-6">
            {search ? "Try adjusting your search terms." : "Be the first to share an Iftar spot!"}
          </p>
          {search ? (
            <Button variant="outline" onClick={() => setSearch("")}>Clear Search</Button>
          ) : (
            <Link href="/add">
              <Button>Add a Place</Button>
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
