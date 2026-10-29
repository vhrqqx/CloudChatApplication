import { create } from "zustand";
import { api, setUnauthorizedHandler, getToken, setToken, clearToken } from "../lib/api.js";
import { setAuthRef, useFriends } from "./friends.js";

const useAuth = create((set, get) => ({
  user: null,
  status: "booting",

  async init() {
    setUnauthorizedHandler(() => {
      clearToken();
      if (get().status === "authed") {
        useFriends.getState().reset();
        set({ user: null, status: "guest" });
      }
    });
    if (!getToken()) {
      set({ status: "guest" });
      return;
    }
    try {
      const me = await api("/auth/me");
      set({ user: me, status: "authed" });
    } catch {
      clearToken();
      set({ status: "guest" });
    }
  },

  async login(userEmail, password) {
    const res = await api("/auth/login", {
      method: "POST",
      body: { userEmail, password },
    });
    setToken(res.accessToken);
    set({ user: res.user, status: "authed" });
  },

  async register(payload) {

    await api("/auth/register", { method: "POST", body: payload });
  },

  logout() {

    api("/auth/logout", { method: "POST" }).catch(() => {});
    clearToken();
    useFriends.getState().reset();
    set({ user: null, status: "guest" });
  },
}));

setAuthRef(useAuth);

export { useAuth };
