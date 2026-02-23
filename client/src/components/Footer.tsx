import { Link } from "wouter";
import { MoonStar, Heart, Globe, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-background pt-12 pb-8 mt-auto">
      <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2 group outline-none">
            <MoonStar className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg tracking-tight">IftarInUAE</span>
          </Link>
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
            <p>© {currentYear}</p>
            <span className="hidden sm:inline opacity-40">•</span>
            <p className="font-medium flex items-center gap-1.5">
              Built by <a href="https://github.com/adilzubair" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors border-b border-border/60 hover:border-primary pb-px">Muhamed Adil</a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a href="https://linkedin.com/in/muhamedadil" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
            <Linkedin className="w-4 h-4" />
          </a>
          <a href="https://twitter.com/adilwritescode" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
            <Twitter className="w-4 h-4" />
          </a>
          <a href="https://www.muhamedadil.com/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Website">
            <Globe className="w-4 h-4" />
          </a>
          <a href="https://github.com/adilzubair" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
            <Heart className="w-4 h-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
