
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Make sure to toggle between "light" and "dark" (named "light" not "white")
const ThemeSwitcher = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const toggleTheme = () => {
    // Toggle between "dark" and "light"
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <Button
      className="fixed top-6 right-6 z-50 rounded-full p-2 bg-white/80 dark:bg-white/10 backdrop-blur-lg shadow-lg border border-white/20 hover:bg-white/60 dark:hover:bg-white/20 transition text-gray-900 dark:text-white"
      variant="ghost"
      size="icon"
      aria-label="Toggle Theme"
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-6 w-6 text-yellow-400" />
      ) : (
        <Moon className="h-6 w-6 text-indigo-600" />
      )}
    </Button>
  );
};

export default ThemeSwitcher;
