
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

// This switcher now supports: dark, light, and white.
// "white" and "light" are mapped to 'light', but a class on body will add further styles.
const ThemeSwitcher = () => {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // App specifically treats "white" as super-light mode (still mapped to "light" for next-themes)
  const [isWhite, setIsWhite] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Ensure white mode as a superset of light mode: add .white-mode class to <body>
  useEffect(() => {
    if (isWhite) {
      document.body.classList.add('white-mode');
      setTheme('light');
    } else {
      document.body.classList.remove('white-mode');
    }
  }, [isWhite, setTheme]);

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setIsWhite(true);
    } else if (isWhite) {
      setIsWhite(false);
      setTheme("dark");
    } else {
      setIsWhite(false);
      setTheme("light");
    }
  };

  if (!mounted) return null;

  return (
    <Button
      className={`fixed top-6 right-6 z-50 rounded-full p-2 
        ${isWhite || resolvedTheme === 'light' ? 'bg-white/90' : 'bg-white/10'} 
        ${resolvedTheme === 'dark' ? 'dark:bg-white/10' : ''} 
        backdrop-blur-lg shadow-lg border border-white/20
        hover:bg-white/70 dark:hover:bg-white/20 transition text-gray-900 dark:text-white`}
      variant="ghost"
      size="icon"
      aria-label="Toggle Theme"
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" || (!isWhite && resolvedTheme === "dark") ? (
        <Sun className="h-6 w-6 text-yellow-400" />
      ) : isWhite || resolvedTheme === "light" ? (
        <Moon className="h-6 w-6 text-indigo-600" />
      ) : (
        <Sun className="h-6 w-6" />
      )}
      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
};

export default ThemeSwitcher;
