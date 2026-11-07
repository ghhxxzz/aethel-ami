import { createJSONStorage } from "zustand/middleware";

/** localStorage com proteção: se o disco estiver cheio ou bloqueado, o app continua funcionando (só não salva). */
export const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      console.error("Não foi possível salvar os dados:", e);
    }
  },
  removeItem: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignora */
    }
  },
}));
