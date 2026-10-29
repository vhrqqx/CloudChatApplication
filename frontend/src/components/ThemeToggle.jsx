import { useTheme } from "../store/theme.js";
import { Moon, Sun } from "@phosphor-icons/react";





export default function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      title={isDark ? "Giao diện sáng" : "Giao diện tối"}
      className="flex h-10 w-10 items-center justify-center transition-colors duration-150 hover:rounded-[8px]"
      style={{ color: "var(--text-secondary)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
    >
      {isDark ? (
        <Sun size={20} weight="regular" />
      ) : (
        <Moon size={20} weight="regular" />
      )}
    </button>
  );
}
