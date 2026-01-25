import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({ 
  value, 
  onChange, 
  readOnly = false, 
  size = "md",
  className 
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          className={cn(
            "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
            readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= value 
                ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]" 
                : "fill-muted text-muted-foreground/20"
            )}
          />
        </button>
      ))}
    </div>
  );
}
