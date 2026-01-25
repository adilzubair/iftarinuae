import { useState, useEffect } from "react";
import { onAuthChange, signOut, getIdToken, type User as FirebaseUser } from "@/lib/firebase";

export interface User {
  id: string;
  firebaseUid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get the ID token and fetch user from our backend
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch("/api/auth/user", {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });

          if (response.ok) {
            const user = await response.json();
            setAuthState({
              user,
              firebaseUser,
              isLoading: false,
              isAuthenticated: true,
            });
          } else {
            // Backend error, but Firebase user exists
            setAuthState({
              user: null,
              firebaseUser,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          setAuthState({
            user: null,
            firebaseUser,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          firebaseUser: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Also call backend logout for cleanup
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    user: authState.user,
    firebaseUser: authState.firebaseUser,
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    logout,
    isLoggingOut,
    getIdToken,
  };
}
