
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const themeModes = [
  { key: "system", icon: <LayoutDashboard className="h-6 w-6 text-indigo-500" />, label: "Système" },
  { key: "light", icon: <Sun className="h-6 w-6 text-yellow-400" />, label: "Clair" },
  { key: "dark", icon: <Moon className="h-6 w-6 text-indigo-600" />, label: "Sombre" },
];

const ThemeSwitcher = () => {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Custom: cycle through system > light > dark
  const nextMode = () => {
    const currentIndex = themeModes.findIndex(t => t.key === theme);
    const nextIndex = (currentIndex + 1) % themeModes.length;
    setTheme(themeModes[nextIndex].key);
  };

  if (!mounted) return null;

  const displayIcon =
    theme === "system"
      ? themeModes[0].icon
      : theme === "light"
      ? themeModes[1].icon
      : themeModes[2].icon;

  return (
    <Button
      className="fixed top-6 right-6 z-50 rounded-full p-2 bg-white/80 dark:bg-white/10 backdrop-blur-lg shadow-lg border border-white/20 hover:bg-white/60 dark:hover:bg-white/20 transition text-gray-900 dark:text-white"
      variant="ghost"
      size="icon"
      aria-label="Changer le thème"
      onClick={nextMode}
      title="Changer le mode d’apparence"
    >
      {displayIcon}
    </Button>
  );
};

export default ThemeSwitcher;
