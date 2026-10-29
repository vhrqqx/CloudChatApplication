export function formatChatListTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffSec = (now - d) / 1000;
  if (diffSec < 60) return "Vừa xong";
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  const opts = { day: "2-digit", month: "2-digit" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("vi-VN", opts);
}

export function formatBubbleTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hm = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return hm;
  const dm = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `${dm} ${hm}`;
}
