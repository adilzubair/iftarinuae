import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavBar } from "@/components/NavBar";
import Home from "@/pages/Home";
import PlaceDetails from "@/pages/PlaceDetails";
import AddPlace from "@/pages/AddPlace";
import LoginPage from "@/pages/LoginPage";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page
    window.location.href = "/login";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={LoginPage} />
          <Route path="/places/:id" component={PlaceDetails} />
          <Route path="/add">
            <ProtectedRoute component={AddPlace} />
          </Route>
          <Route path="/admin">
            <ProtectedRoute component={Admin} />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <footer className="py-8 border-t border-border/40 text-center text-sm text-muted-foreground bg-secondary/20">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} IftarInUAE. Community driven.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary>
          <Router />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
