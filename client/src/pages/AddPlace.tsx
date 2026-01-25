import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPlaceSchema, type CreatePlaceRequest } from "@shared/schema";
import { useCreatePlace } from "@/hooks/use-places";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, MapPin, Store } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function AddPlace() {
  const [, setLocation] = useLocation();
  const createPlace = useCreatePlace();
  
  const form = useForm<CreatePlaceRequest>({
    resolver: zodResolver(insertPlaceSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
    },
  });

  const onSubmit = async (data: CreatePlaceRequest) => {
    try {
      await createPlace.mutateAsync(data);
      setLocation("/");
    } catch (error) {
      // Error is handled by mutation onError
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Cancel and go back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold mb-2">Share a new place</h1>
          <p className="text-muted-foreground">Help the community discover great Iftar spots.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-card p-6 md:p-8 rounded-3xl border border-border/50 shadow-sm">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Place Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Store className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                      <Input placeholder="e.g. Al Mandi House" className="pl-10 h-12 rounded-xl" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Location</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                      <Input placeholder="e.g. Downtown Dubai, near Burj Khalifa" className="pl-10 h-12 rounded-xl" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What kind of food do they serve? Is it a buffet or set menu?" 
                      className="min-h-[140px] resize-none rounded-xl" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30"
              disabled={createPlace.isPending}
            >
              {createPlace.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Adding Place...
                </>
              ) : "Add Place"}
            </Button>
          </form>
        </Form>
      </motion.div>
    </div>
  );
}
