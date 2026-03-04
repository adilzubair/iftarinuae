import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useWebHaptics } from "web-haptics/react"

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const { trigger } = useWebHaptics()

  // To solve hydration mismatch, we can just toggle simple state,
  // but next-themes handles this. A simple toggle is fine.
  // Next-themes injects 'dark' class, we read the resolved theme.
  
  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        trigger([{ duration: 8 }], { intensity: 0.3 })
        setTheme(currentTheme === "dark" ? "light" : "dark")
      }}
      className="rounded-full w-9 h-9 border border-border/40 hover:bg-secondary transition-colors"
      title="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
