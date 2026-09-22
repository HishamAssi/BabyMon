import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button.js";
import { getEffectiveTheme, setTheme, type Theme } from "../theme.js";

export default function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(getEffectiveTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
