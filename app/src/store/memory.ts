import { create } from "zustand";
import { persist } from "zustand/middleware";
import { safeStorage } from "./storage";

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: number;
}

export const MAX_ITEMS = 40;
export const MAX_CHARS = 500;

interface MemoryState {
  enabled: boolean;
  items: MemoryItem[];
  setEnabled: (v: boolean) => void;
  add: (text: string) => "ok" | "vazio" | "limite";
  remove: (id: string) => void;
  clear: () => void;
}

/** Memória escrita pela própria pessoa. Só entra na conversa quando está ligada. */
export const useMemory = create<MemoryState>()(
  persist(
    (set, get) => ({
      enabled: true,
      items: [],
      setEnabled: (enabled) => set({ enabled }),
      add: (text) => {
        const clean = text.trim().slice(0, MAX_CHARS);
        if (!clean) return "vazio";
        if (get().items.length >= MAX_ITEMS) return "limite";
        set((s) => ({ items: [...s.items, { id: crypto.randomUUID(), text: clean, createdAt: Date.now() }] }));
        return "ok";
      },
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "aethel-ami-memory", storage: safeStorage },
  ),
);
