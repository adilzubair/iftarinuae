import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoonStar, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle } from "@/lib/firebase";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      toast({
        title: "Welcome!",
        description: `Signed in as ${user.displayName || user.email}`,
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Sign-in failed",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-xl">
              <MoonStar className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">IftarInUAE</CardTitle>
          <CardDescription>Sign in to share and discover Iftar spots</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button 
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full h-12 text-base font-medium gap-3"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <FcGoogle className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Secure Authentication
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
