import { useParams, Link } from "wouter";
import { usePlace, useCreateReview } from "@/hooks/use-places";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { Loader2, MapPin, ArrowLeft, Calendar, User, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SEO } from "@/components/SEO";
import { ShareButton } from "@/components/ShareButton";

export default function PlaceDetails() {
  const { id } = useParams();
  const { data: place, isLoading, error } = usePlace(id!);
  const { isAuthenticated } = useAuth();
  
  if (isLoading) return (
    <div className="h-[80vh] flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
    </div>
  );
  
  if (error || !place) return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h2 className="text-2xl font-bold mb-4">Place not found</h2>
      <Link href="/"><Button variant="outline">Back Home</Button></Link>
    </div>
  );

  const avgRating = place.averageRating || (place.reviews.length > 0
    ? place.reviews.reduce((sum, r) => sum + r.rating, 0) / place.reviews.length
    : 0);

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-4xl">
      <SEO 
        title={place.name}
        description={place.description || `Check out ${place.name} in ${place.location} for Iftar.`}
        schema={{
          "@context": "https://schema.org",
          "@type": "FoodEstablishment",
          "name": place.name,
          "description": place.description,
          "address": place.location,
          "geo": place.latitude && place.longitude ? {
            "@type": "GeoCoordinates",
            "latitude": place.latitude,
            "longitude": place.longitude
          } : undefined,
          "aggregateRating": place.reviews.length > 0 ? {
            "@type": "AggregateRating",
            "ratingValue": avgRating,
            "reviewCount": place.reviews.length
          } : undefined
        }}
      />
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to places
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-[32px] border border-border/40 shadow-soft-lg p-8 md:p-12 mb-12 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-300/60 via-orange-400/60 to-red-400/60" />
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-5 text-balance tracking-tight text-foreground/95">{place.name}</h1>
            
            <div className="flex items-center gap-4 text-muted-foreground mb-6 flex-wrap">
              {place.latitude && place.longitude ? (
                <button
                  type="button"
                  onClick={() => window.open(`https://www.google.com/maps?q=${place.latitude},${place.longitude}`, "_blank")}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
                >
                  <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="underline underline-offset-2 decoration-dashed">{place.location}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{place.location}</span>
                </div>
              )}
              <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Star className="w-4 h-4 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
                <span>{avgRating > 0 ? avgRating.toFixed(1) : "New"}</span>
                <span className="text-muted-foreground font-normal">({place.reviews.length} reviews)</span>
              </div>
            </div>

            <p className="text-lg leading-relaxed text-muted-foreground/90 max-w-2xl">
              {place.description || "No description provided."}
            </p>
          </div>
          
          <div className="flex gap-3">
            <ShareButton 
              title={place.name}
              text={place.description || `Check out ${place.name} in ${place.location} for Iftar.`}
              url={typeof window !== 'undefined' ? window.location.href : ''}
              size="lg"
              variant="outline"
              className="rounded-xl shadow-sm shrink-0 border-border/80 bg-background hover:bg-secondary/50"
            />
            <ReviewDialog placeId={place.id} isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </motion.div>

      <div className="space-y-8">
        <h2 className="text-2xl font-display font-bold">Reviews</h2>
        
        {place.reviews.length === 0 ? (
          <div className="text-center py-12 bg-secondary/20 rounded-2xl border border-dashed border-border/60">
            <p className="text-muted-foreground mb-4">No reviews yet. Be the first to share your experience!</p>
            <ReviewDialog placeId={place.id} isAuthenticated={isAuthenticated} label="Write First Review" />
          </div>
        ) : (
          <div className="grid gap-6">
            {place.reviews.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).map((review) => (
              <motion.div 
                key={review.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="bg-card p-8 rounded-[24px] border border-border/30 shadow-soft"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarFallback className="bg-secondary text-secondary-foreground font-medium">
                        <User className="w-5 h-5 opacity-50" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">Community Member</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(review.createdAt!), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <StarRating value={review.rating} readOnly size="sm" />
                </div>
                
                {review.comment && (
                  <p className="text-muted-foreground leading-relaxed pl-13">
                    {review.comment}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewDialog({ placeId, isAuthenticated, label = "Write a Review" }: { placeId: string, isAuthenticated: boolean, label?: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const createReview = useCreateReview(placeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    
    await createReview.mutateAsync({
      rating,
      comment,
    } as any);
    setOpen(false);
    setRating(0);
    setComment("");
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      window.location.href = "/login";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleTriggerClick} size="lg" className="rounded-xl shadow-md font-semibold shrink-0">
          <Star className="w-4 h-4 mr-2" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Rate your experience</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="flex flex-col items-center gap-4 py-4 bg-secondary/30 rounded-xl">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tap stars to rate</span>
            <StarRating value={rating} onChange={setRating} size="lg" />
            <span className="text-sm font-semibold h-5">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </span>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Comments (optional)</label>
            <Textarea 
              placeholder="What did you like about the food or atmosphere?" 
              className="resize-none min-h-[120px] rounded-xl bg-secondary/20 border-border focus:bg-background transition-colors"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-base font-semibold"
            disabled={rating === 0 || createReview.isPending}
          >
            {createReview.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : "Post Review"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
