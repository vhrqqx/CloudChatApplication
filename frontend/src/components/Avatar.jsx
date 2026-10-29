import { Users } from "@phosphor-icons/react";


export function initialsOf(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}







export default function Avatar({
  name,
  size = 40,
  isGroup = false,
  withPresence = false,
  ringToken = "--bg-rail",
  className = "",
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{ background: "#27272A", color: "#FFFFFF" }}
        aria-hidden="true"
      >
        {isGroup ? (
          <Users size={Math.round(size / 2)} weight="regular" />
        ) : (
          <span
            style={{
              fontSize: size <= 32 ? 11 : 13,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {initialsOf(name)}
          </span>
        )}
      </span>
      {withPresence && (
        <span
          className="absolute rounded-full"
          style={{
            width: 8,
            height: 8,
            bottom: 0,
            right: 0,
            background: "var(--presence)",
            boxShadow: `0 0 0 2px var(${ringToken})`,
          }}
        />
      )}
    </span>
  );
}
