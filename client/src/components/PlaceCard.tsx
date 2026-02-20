import { Link } from "wouter";
import { MapPin, Star, MessageSquare } from "lucide-react";
import { type PlaceWithReviews } from "@shared/schema";
import { motion } from "framer-motion";
import { ShareButton } from "./ShareButton";

interface PlaceCardProps {
  place: PlaceWithReviews;
  index: number;
}

export function PlaceCard({ place, index }: PlaceCardProps) {
  // Calculate stats if backend doesn't provide them
  const avgRating = place.averageRating || (place.reviews.length > 0
    ? place.reviews.reduce((sum, r) => sum + r.rating, 0) / place.reviews.length
    : 0);
  
  const reviewCount = place.reviewCount || place.reviews.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/places/${place.id}`} className="block h-full group">
        <article className="h-full bg-card rounded-[20px] border border-border/40 p-6 shadow-soft hover:shadow-soft-lg hover:-translate-y-1.5 hover:border-l-[4px] hover:border-l-uae-green transition-all duration-400 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300/40 via-orange-400/40 to-red-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-display font-bold text-lg leading-tight group-hover:text-primary/80 transition-colors">
                {place.name}
              </h3>
              {avgRating > 0 && (
                <div className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-full">
                  <Star className="w-3.5 h-3.5 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
                  <span className="text-xs font-semibold">{avgRating.toFixed(1)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-start gap-1.5 text-muted-foreground mb-4">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-uae-red" />
              <div className="flex flex-col">
                {typeof (place as any).distance === 'number' && (
                  <span className="text-xs font-semibold text-primary mb-0.5">
                    {((place as any).distance as number).toFixed(1)} km away
                  </span>
                )}
                {place.latitude && place.longitude ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(`https://www.google.com/maps?q=${place.latitude},${place.longitude}`, "_blank");
                    }}
                    className="text-sm line-clamp-2 text-left hover:text-primary underline underline-offset-2 decoration-dashed transition-colors"
                  >
                    {place.location}
                  </button>
                ) : (
                  <p className="text-sm line-clamp-2">{place.location}</p>
                )}
              </div>
            </div>
            
            {place.description && (
              <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-4 leading-relaxed">
                {place.description}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground relative z-10">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>
            </div>
            <div className="flex items-center gap-3">
              <ShareButton 
                title={place.name} 
                text={`Check out ${place.name} in ${place.location} for Iftar!`}
                url={`${window.location.origin}/places/${place.id}`}
                className="hover:bg-secondary text-muted-foreground w-8 h-8 transition-opacity"
              />
              <span className="font-medium text-uae-green group-hover:translate-x-1 transition-transform">
                View details →
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
