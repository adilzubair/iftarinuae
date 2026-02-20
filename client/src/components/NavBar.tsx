import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { MoonStar, LogOut, User as UserIcon, ShieldAlert } from "lucide-react";
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

  const handleLogin = () => {
    window.location.href = "/login";
  };

  return (
    <div className="sticky top-0 z-50 w-full pt-4 px-4 pb-6 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-transparent -z-10" />
      <div className="max-w-5xl mx-auto pointer-events-auto">
        <nav className="bg-background/20 backdrop-blur-xl backdrop-saturate-150 border border-white/20 dark:border-white/10 shadow-soft-lg shadow-black/5 rounded-full h-16 flex items-center justify-between px-2 md:px-4 transition-all duration-300">
          <Link href="/" className="flex items-center gap-2.5 group ml-2">
            <div className="bg-primary text-primary-foreground p-2 rounded-full group-hover:bg-primary/90 transition-all duration-300 shadow-sm group-hover:shadow group-hover:-translate-y-0.5">
              <MoonStar className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg md:text-xl tracking-tight">IftarInUAE</span>
          </Link>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                    <AvatarFallback className="bg-secondary">
                      {user?.firstName?.charAt(0) || <UserIcon className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border/60 shadow-lg">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-0.5 leading-none">
                    <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
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
            <Button onClick={handleLogin} size="sm" className="font-medium rounded-full px-6 mr-1 shadow-sm">
              Sign in
            </Button>
          )}
        </div>
        </nav>
      </div>
    </div>
  );
}
