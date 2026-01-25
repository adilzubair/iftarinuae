import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { CreatePlaceRequest, CreateReviewRequest, PlaceWithReviews } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getIdToken } from "@/lib/firebase";

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getIdToken();
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// === PLACES HOOKS ===

export function usePlaces() {
  return useQuery({
    queryKey: [api.places.list.path],
    queryFn: async () => {
      const res = await fetch(api.places.list.path);
      if (!res.ok) throw new Error("Failed to fetch places");
      return await res.json() as PlaceWithReviews[];
    },
  });
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: [api.places.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.places.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch place details");
      }
      return await res.json() as PlaceWithReviews;
    },
    enabled: !!id,
  });
}

export function useCreatePlace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePlaceRequest) => {
      const headers = await getAuthHeaders();
      const res = await fetch(api.places.create.path, {
        method: api.places.create.method,
        headers,
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Please sign in to add a place");
        if (res.status === 400) throw new Error("Invalid place data");
        throw new Error("Failed to create place");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.places.list.path] });
      toast({
        title: "Place Added",
        description: "Thank you for sharing this Iftar spot!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// === REVIEWS HOOKS ===

export function useCreateReview(placeId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateReviewRequest) => {
      const url = buildUrl(api.reviews.create.path, { id: placeId });
      const headers = await getAuthHeaders();
      const res = await fetch(url, {
        method: api.reviews.create.method,
        headers,
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Please sign in to leave a review");
        if (res.status === 409) throw new Error("You have already reviewed this place");
        throw new Error("Failed to submit review");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.places.get.path, placeId] });
      queryClient.invalidateQueries({ queryKey: [api.places.list.path] });

      toast({
        title: "Review Submitted",
        description: "Your feedback helps the community!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
