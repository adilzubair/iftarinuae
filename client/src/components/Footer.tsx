import { Link } from "wouter";
import { MoonStar, Heart, Globe, Linkedin, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-background border-t border-border/40 pt-16 pb-12 mt-auto">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Logo and Tagline */}
          <div className="space-y-4 col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 group outline-none">
              <div className="bg-primary text-primary-foreground p-2 rounded-full group-hover:bg-primary/90 transition-all duration-300 shadow-sm">
                <MoonStar className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight">IftarInUAE</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
              A community-driven platform helping you find and share the best Iftar spots across the Emirates. Built for the community, by the community.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-foreground/80">Platform</h4>
            <nav className="flex flex-col gap-2.5">
              <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">Browse Places</Link>
              <Link href="/add" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">Add a Spot</Link>
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">Admin Dashboard</Link>
            </nav>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm uppercase tracking-wider text-foreground/80">Support</h4>
            <nav className="flex flex-col gap-2.5">
              <a href="mailto:contact@iftarinuae.com" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">Contact Us</a>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors w-fit">Terms of Service</Link>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border/60 to-transparent mb-8" />

        {/* Attribution and Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              © {currentYear} IftarInUAE. All rights reserved.
            </p>
            <p className="text-xs font-medium flex items-center justify-center md:justify-start gap-1 text-muted-foreground/80">
              Crafted with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> by <a href="https://github.com/adilzubair" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors border-b border-border hover:border-primary pb-px">Muhamed Adil</a>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="https://linkedin.com/in/muhamedadil" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a 
              href="https://twitter.com/adilwritescode" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
              aria-label="Twitter"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a 
              href="https://www.muhamedadil.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
              aria-label="Website"
            >
              <Globe className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
