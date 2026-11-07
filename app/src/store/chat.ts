import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError, streamChat } from "../services/api";
import type { ChatMessage } from "../services/api";
import { useMemory } from "./memory";
import { safeStorage } from "./storage";

export interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  busy: boolean;
  notice: string | null;
  send: (text: string) => void;
  stop: () => void;
  retry: () => void;
  newChat: () => void;
  open: (id: string) => void;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

const CONTEXT_LIMIT = 30;
const MAX_CONVERSATIONS = 200;
let controller: AbortController | null = null;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const uid = () => crypto.randomUUID();
const makeTitle = (t: string) => {
  const one = t.replace(/\s+/g, " ").trim();
  return one.length > 40 ? one.slice(0, 40) + "…" : one || "Nova conversa";
};

/** Conversas salvas no armazenamento do app: continuam ali depois de fechar e abrir o programa. */
export const useChat = create<ChatState>()(
  persist(
    (set, get) => {
      const showNotice = (text: string) => {
        set({ notice: text });
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => set({ notice: null }), 5000);
      };
      const patchConv = (id: string, fn: (c: Conversation) => Conversation) =>
        set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? fn(c) : c)) }));

      const generate = async (convId: string) => {
        const conv = get().conversations.find((c) => c.id === convId);
        if (!conv) return;
        const history: ChatMessage[] = conv.messages
          .filter((m) => !m.error && m.content.trim() !== "")
          .slice(-CONTEXT_LIMIT)
          .map((m) => ({ role: m.role, content: m.content }));
        const mem = useMemory.getState();
        const memory = mem.enabled ? mem.items.map((i) => i.text) : [];

        const reply: Msg = { id: uid(), role: "assistant", content: "" };
        patchConv(convId, (c) => ({ ...c, messages: [...c.messages, reply], updatedAt: Date.now() }));
        set({ busy: true });

        const ctrl = new AbortController();
        controller = ctrl;
        const patchReply = (fn: (m: Msg) => Msg) =>
          patchConv(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === reply.id ? fn(m) : m)) }));

        try {
          await streamChat(history, (d) => patchReply((m) => ({ ...m, content: m.content + d })), ctrl.signal, memory);
        } catch (e) {
          if (!ctrl.signal.aborted) {
            patchReply((m) => ({ ...m, error: e instanceof ApiError ? e.message : "Algo deu errado. Tente de novo." }));
          }
        } finally {
          if (controller === ctrl) controller = null;
          set({ busy: false });
          patchConv(convId, (c) => ({
            ...c,
            messages: c.messages.filter((m) => m.id !== reply.id || m.content !== "" || m.error),
          }));
        }
      };

      return {
        conversations: [],
        activeId: null,
        busy: false,
        notice: null,

        send: (text) => {
          const clean = text.trim();
          if (!clean || get().busy) return;

          // Comando local: só diz que salvou se de fato salvou.
          const cmd = clean.match(/^\/lembrar\s+([\s\S]+)/i);
          if (cmd) {
            const mem = useMemory.getState();
            if (!mem.enabled) return showNotice("A memória está desligada. Ligue em Memória para salvar.");
            const r = mem.add(cmd[1]);
            if (r === "limite") return showNotice("A memória está cheia (40 itens). Apague algum em Memória.");
            if (r === "vazio") return showNotice("Escreva o que quer lembrar depois de /lembrar.");
            return showNotice("Salvei na memória. Você pode ver e apagar em Memória.");
          }

          let id = get().activeId;
          if (!id || !get().conversations.some((c) => c.id === id)) {
            id = uid();
            const now = Date.now();
            const fresh: Conversation = { id, title: makeTitle(clean), createdAt: now, updatedAt: now, messages: [] };
            set((s) => ({ conversations: [fresh, ...s.conversations].slice(0, MAX_CONVERSATIONS), activeId: id }));
          }
          const convId = id;
          patchConv(convId, (c) => ({
            ...c,
            title: c.messages.length === 0 ? makeTitle(clean) : c.title,
            messages: [...c.messages, { id: uid(), role: "user", content: clean }],
          }));
          void generate(convId);
        },

        stop: () => controller?.abort(),

        retry: () => {
          const { activeId, busy, conversations } = get();
          const conv = conversations.find((c) => c.id === activeId);
          const last = conv?.messages[conv.messages.length - 1];
          if (busy || !conv || !last || last.role !== "assistant" || !last.error) return;
          patchConv(conv.id, (c) => ({ ...c, messages: c.messages.slice(0, -1) }));
          void generate(conv.id);
        },

        newChat: () => {
          controller?.abort();
          set({ activeId: null });
        },
        open: (id) => {
          if (id === get().activeId) return;
          controller?.abort();
          set({ activeId: id });
        },
        rename: (id, title) => {
          const t = title.replace(/\s+/g, " ").trim().slice(0, 80);
          if (t) patchConv(id, (c) => ({ ...c, title: t }));
        },
        remove: (id) => {
          if (get().activeId === id) controller?.abort();
          set((s) => ({
            conversations: s.conversations.filter((c) => c.id !== id),
            activeId: s.activeId === id ? null : s.activeId,
          }));
        },
        clearAll: () => {
          controller?.abort();
          set({ conversations: [], activeId: null });
        },
      };
    },
    {
      name: "aethel-ami-chats",
      storage: safeStorage,
      partialize: (s) => ({ conversations: s.conversations, activeId: s.activeId }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Pick<ChatState, "conversations" | "activeId">>;
        // limpa respostas vazias que ficaram de uma geração interrompida ao fechar o app
        const conversations = (p.conversations ?? []).map((c) => ({
          ...c,
          messages: c.messages.filter((m) => m.role === "user" || m.content !== "" || m.error),
        }));
        const activeId = conversations.some((c) => c.id === p.activeId) ? (p.activeId ?? null) : null;
        return { ...current, conversations, activeId };
      },
    },
  ),
);
