
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThemeSwitcher = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <Button
      className="fixed top-6 right-6 z-50 rounded-full p-2 bg-white/10 backdrop-blur shadow-lg border border-white/20 hover:bg-white/20 transition text-white dark:text-gray-900"
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
