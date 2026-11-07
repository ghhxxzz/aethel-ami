/** Fala com o backend do Aethel. A chave da IA nunca passa por aqui: ela só existe no servidor. */
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8787";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/** Envia a conversa e entrega o texto da resposta aos poucos (streaming). */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal: AbortSignal,
  memory: string[] = [],
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, memory }),
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new ApiError("Não consegui falar com o servidor. Ele está ligado e o endereço está certo?", "rede");
  }

  if (!res.ok) {
    let message = `O servidor respondeu com erro ${res.status}.`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) message = j.message;
    } catch {
      /* corpo não era JSON */
    }
    throw new ApiError(message, "http");
  }
  if (!res.body) throw new ApiError("O servidor não enviou resposta.", "vazio");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const ev of events) {
      const line = ev.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      let obj: { delta?: string; error?: string; message?: string };
      try {
        obj = JSON.parse(data) as typeof obj;
      } catch {
        continue;
      }
      if (obj.error) throw new ApiError(obj.message ?? "Erro na resposta da IA.", obj.error);
      if (obj.delta) onDelta(obj.delta);
    }
  }
}

/** Manda um áudio gravado ao backend e recebe o texto transcrito. */
export async function transcribe(audio: Blob, signal: AbortSignal): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/transcribe`, {
      method: "POST",
      headers: { "Content-Type": audio.type || "audio/webm" },
      body: audio,
      signal,
    });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new ApiError("Não consegui enviar o áudio ao servidor. Ele está ligado?", "rede");
  }
  if (!res.ok) {
    let message = `O servidor respondeu com erro ${res.status}.`;
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) message = j.message;
    } catch {
      /* corpo não era JSON */
    }
    throw new ApiError(message, "http");
  }
  const j = (await res.json()) as { text?: string };
  return j.text ?? "";
}

/** Faz um pedido leve ao backend ao abrir o app, para acordar um servidor gratuito que "dormiu". */
export function wakeServer(): void {
  fetch(`${API_URL}/health`).catch(() => {
    /* sem problema: o chat mostra o erro de verdade se o servidor estiver fora */
  });
}
