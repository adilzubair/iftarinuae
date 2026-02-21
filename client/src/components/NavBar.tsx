import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MoonStar, LogOut, User as UserIcon, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  const handleLogin = () => {
    window.location.href = "/login";
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50 w-full pt-4 px-4 pb-6 pointer-events-none">
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-transparent -z-10"
        initial={false}
        animate={{ opacity: isScrolled ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      />
      <div className="max-w-5xl mx-auto w-full pointer-events-auto flex justify-center px-4">
        <nav 
          className={`bg-background/20 backdrop-blur-xl backdrop-saturate-150 border border-white/20 dark:border-white/10 shadow-soft-lg shadow-black/5 rounded-full h-16 flex items-center relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] w-full ${
            isScrolled ? "max-w-[210px]" : "max-w-[1024px]"
          }`}
        >
          <div className="w-[178px] shrink-0 ml-4 flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group outline-none shrink-0">
              <div className="bg-primary text-primary-foreground p-2 rounded-full group-hover:bg-primary/90 transition-all duration-300 shadow-sm group-hover:shadow group-hover:-translate-y-0.5">
                <MoonStar className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-lg md:text-xl tracking-tight">IftarInUAE</span>
            </Link>
          </div>

          <div
            className={`absolute right-4 flex items-center gap-4 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
              isScrolled ? "opacity-0 translate-x-8 pointer-events-none scale-95" : "opacity-100 translate-x-0 pointer-events-auto scale-100"
            }`}
          >
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full shrink-0">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback className="bg-secondary">
                        {user?.firstName?.charAt(0) || <UserIcon className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border/60 shadow-lg mt-2">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {user?.isAdmin && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer w-full flex items-center rounded-lg">
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={() => logout()} className="text-red-500 focus:text-red-500 focus:bg-red-50 rounded-lg cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={handleLogin} size="sm" className="font-medium rounded-full px-6 shadow-sm shrink-0">
                Sign in
              </Button>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
}
