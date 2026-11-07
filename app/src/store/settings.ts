import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeId } from "../themes/themes";

interface SettingsState {
  theme: ThemeId;
  introEnabled: boolean;
  /** Sobe a cada pedido de "ver a introdução de novo". Não é salvo no disco. */
  introNonce: number;
  setTheme: (theme: ThemeId) => void;
  setIntroEnabled: (value: boolean) => void;
  replayIntro: () => void;
}

/** Salvo no armazenamento local do app (WebView), então sobrevive a fechar e abrir o programa. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "black-purple",
      introEnabled: true,
      introNonce: 0,
      setTheme: (theme) => set({ theme }),
      setIntroEnabled: (introEnabled) => set({ introEnabled }),
      replayIntro: () => set((s) => ({ introNonce: s.introNonce + 1 })),
    }),
    {
      name: "aethel-ami-settings",
      partialize: (s) => ({ theme: s.theme, introEnabled: s.introEnabled }),
    },
  ),
);
