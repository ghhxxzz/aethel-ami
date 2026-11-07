import { create } from "zustand";
import { persist } from "zustand/middleware";
import { safeStorage } from "./storage";

interface VoiceState {
  autoRead: boolean; // ler a resposta em voz alta quando ela termina
  voiceURI: string; // "" = escolher uma voz em português automaticamente
  rate: number; // velocidade da fala
  setAutoRead: (v: boolean) => void;
  setVoiceURI: (v: string) => void;
  setRate: (v: number) => void;
}

export const useVoice = create<VoiceState>()(
  persist(
    (set) => ({
      autoRead: false,
      voiceURI: "",
      rate: 1,
      setAutoRead: (autoRead) => set({ autoRead }),
      setVoiceURI: (voiceURI) => set({ voiceURI }),
      setRate: (rate) => set({ rate }),
    }),
    { name: "aethel-ami-voice", storage: safeStorage },
  ),
);
