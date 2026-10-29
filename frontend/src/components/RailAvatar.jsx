import { useState } from "react";
import Avatar from "./Avatar.jsx";
import ProfileModal from "./ProfileModal.jsx";
import { useAuth } from "../store/auth.js";






export default function RailAvatar() {
  const username = useAuth((s) => s.user?.username);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Hồ sơ & Cài đặt"
        title="Hồ sơ & Cài đặt"
        className="block rounded-full"
        onClick={() => setOpen(true)}
      >
        <Avatar name={username} size={32} withPresence />
      </button>
      <ProfileModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
