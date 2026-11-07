// Aethel A.M.I. - backend. A chave da Groq vive SOMENTE aqui (variável de ambiente).
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

const PORT = Number(process.env.PORT) || 8787;
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_BASE_URL = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const REASONING_EFFORT = process.env.GROQ_REASONING_EFFORT || "";
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 120000;

const MAX_MESSAGES = 60;
const MAX_CHARS_PER_MESSAGE = 20000;
const MAX_TOTAL_CHARS = 120000;
const MAX_MEMORY_ITEMS = 40;
const MAX_MEMORY_CHARS = 500;

const DEFAULT_ORIGINS = ["http://localhost:5173", "http://tauri.localhost", "https://tauri.localhost", "tauri://localhost"];
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || DEFAULT_ORIGINS.join(","))
  .split(",").map((s) => s.trim()).filter(Boolean);

const SYSTEM_PROMPT = [
  "Você é o Aethel A.M.I., um assistente de inteligência artificial.",
  "Responda em português do Brasil, a menos que a pessoa escreva em outro idioma.",
  "Use Markdown. Blocos de código vão entre crases triplas com o nome da linguagem.",
  "Contas simples (somas, subtrações, multiplicações, divisões e porcentagens fáceis) devem ser respondidas em texto normal, curto e direto, sem LaTeX. Exemplo: 20 + 20 + 20 + 7 = 67.",
  "Use LaTeX somente quando houver fórmulas de verdade (frações, raízes, potências, equações), sempre com $...$ no meio do texto ou $$...$$ em linha própria. Nunca use \\[ \\], \\( \\), colchetes em volta de contas nem \\boxed.",
  "Em exercícios de matemática mais elaborados, explique o raciocínio passo a passo e confira o resultado no fim.",
  "Se não souber algo, diga que não sabe em vez de inventar.",
].join(" ");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // necessário atrás do proxy do Render, para o limite por IP funcionar

app.use((req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now() - t0}ms`));
  next();
});

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
  }),
);
app.use(express.json({ limit: "256kb" }));

const chatLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "muitas_requisicoes", message: "Muitas mensagens em pouco tempo. Espere um minuto e tente de novo." },
});

app.get("/", (_req, res) => {
  res.json({ service: "aethel-ami-backend", status: "ok", docs: "Use /health para conferir o estado." });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "aethel-ami-backend", model: GROQ_MODEL, keyConfigured: Boolean(GROQ_API_KEY), time: new Date().toISOString() });
});

function validateMessages(body) {
  const list = body?.messages;
  if (!Array.isArray(list) || list.length === 0) return { error: "Envie uma lista 'messages' com pelo menos uma mensagem." };
  if (list.length > MAX_MESSAGES) return { error: `Muitas mensagens no contexto (máximo ${MAX_MESSAGES}).` };
  let total = 0;
  const clean = [];
  for (const m of list) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return { error: "Cada mensagem precisa de 'role' (user ou assistant) e 'content' em texto." };
    }
    if (m.content.length > MAX_CHARS_PER_MESSAGE) return { error: `Uma mensagem passou de ${MAX_CHARS_PER_MESSAGE} caracteres.` };
    total += m.content.length;
    clean.push({ role: m.role, content: m.content });
  }
  if (total > MAX_TOTAL_CHARS) return { error: "A conversa ficou grande demais. Comece uma nova conversa." };
  if (clean[clean.length - 1].role !== "user") return { error: "A última mensagem precisa ser do usuário." };
  return { messages: clean };
}

function validateMemory(body) {
  const mem = body?.memory;
  if (mem === undefined) return { memory: [] };
  if (!Array.isArray(mem) || mem.length > MAX_MEMORY_ITEMS || mem.some((x) => typeof x !== "string" || x.length > MAX_MEMORY_CHARS)) {
    return { error: `A memória aceita até ${MAX_MEMORY_ITEMS} itens de até ${MAX_MEMORY_CHARS} caracteres.` };
  }
  return { memory: mem.map((x) => x.trim()).filter(Boolean) };
}

function buildSystemPrompt(memory) {
  if (memory.length === 0) return SYSTEM_PROMPT;
  return (
    SYSTEM_PROMPT +
    "\n\nInformações que a pessoa pediu para você lembrar (use só quando forem relevantes e não as repita sem necessidade):\n" +
    memory.map((m) => `- ${m}`).join("\n")
  );
}

function upstreamError(status, detail) {
  if (status === 401 || status === 403) return [502, "chave_invalida", "O servidor está com a chave da IA inválida ou sem permissão."];
  if (status === 404) return [502, "modelo_indisponivel", "O modelo configurado não está disponível na Groq. Rode 'npm run models' no backend."];
  if (status === 429) return [429, "limite_da_ia", "A IA atingiu o limite de uso por agora. Tente de novo em instantes."];
  if (status === 400) return [502, "requisicao_recusada", `A IA recusou o pedido. ${detail}`.trim()];
  return [502, "ia_indisponivel", "A IA está indisponível no momento. Tente de novo em instantes."];
}

app.post("/api/chat", chatLimiter, async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(503).json({ error: "servidor_sem_chave", message: "O servidor ainda não tem a chave da IA configurada (GROQ_API_KEY)." });
  }
  const v = validateMessages(req.body);
  if (v.error) return res.status(400).json({ error: "entrada_invalida", message: v.error });
  const mem = validateMemory(req.body);
  if (mem.error) return res.status(400).json({ error: "entrada_invalida", message: mem.error });

  const controller = new AbortController();
  let finished = false;
  res.on("close", () => { if (!finished) controller.abort(new Error("cliente_saiu")); });
  const timer = setTimeout(() => controller.abort(new Error("timeout")), REQUEST_TIMEOUT_MS);

  try {
    const payload = { model: GROQ_MODEL, stream: true, messages: [{ role: "system", content: buildSystemPrompt(mem.memory) }, ...v.messages] };
    if (REASONING_EFFORT) payload.reasoning_effort = REASONING_EFFORT;

    const upstream = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      let detail = "";
      try { detail = (await upstream.text()).slice(0, 200); } catch { /* ignora */ }
      console.error(`Groq respondeu ${upstream.status}: ${detail.replace(/gsk_[A-Za-z0-9]+/g, "[chave]")}`);
      const [status, code, message] = upstreamError(upstream.status, upstream.status === 400 ? detail : "");
      finished = true;
      return res.status(status).json({ error: code, message });
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    while (!done) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") { done = true; break; }
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        } catch { /* linha incompleta ou sem conteúdo: ignora */ }
      }
    }
    finished = true;
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    const reason = controller.signal.reason?.message;
    if (reason === "cliente_saiu") return; // a pessoa clicou em parar: nada a responder
    const timeout = reason === "timeout";
    const body = timeout
      ? { error: "tempo_esgotado", message: "A IA demorou demais para responder. Tente de novo." }
      : { error: "ia_indisponivel", message: "Não consegui falar com a IA. Tente de novo em instantes." };
    console.error(`Falha no chat: ${timeout ? "timeout" : err?.message || err}`);
    finished = true;
    if (res.headersSent) {
      if (!res.writableEnded) { res.write(`data: ${JSON.stringify(body)}\n\n`); res.end(); }
    } else {
      res.status(timeout ? 504 : 502).json(body);
    }
  } finally {
    clearTimeout(timer);
  }
});

const sttLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "muitas_requisicoes", message: "Muitos áudios em pouco tempo. Espere um minuto e tente de novo." },
});
const EXT = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav" };

// Voz -> texto. O navegador/app grava o áudio e manda para cá; a chave continua só no servidor.
app.post(
  "/api/transcribe",
  sttLimiter,
  express.raw({ type: ["audio/*", "application/octet-stream"], limit: MAX_AUDIO_BYTES }),
  async (req, res) => {
    if (!GROQ_API_KEY) return res.status(503).json({ error: "servidor_sem_chave", message: "O servidor ainda não tem a chave da IA configurada (GROQ_API_KEY)." });
    const audio = req.body;
    if (!Buffer.isBuffer(audio) || audio.length < 1000) {
      return res.status(400).json({ error: "audio_invalido", message: "O áudio veio vazio ou curto demais." });
    }
    const mime = String(req.headers["content-type"] || "audio/webm").split(";")[0].trim().toLowerCase();
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mime }), `audio.${EXT[mime] || "webm"}`);
    form.append("model", STT_MODEL);
    form.append("language", "pt");
    form.append("response_format", "json");
    try {
      const r = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) {
        let detail = "";
        try { detail = (await r.text()).slice(0, 200); } catch { /* ignora */ }
        console.error(`Groq (áudio) respondeu ${r.status}: ${detail.replace(/gsk_[A-Za-z0-9]+/g, "[chave]")}`);
        const [status, code, message] = upstreamError(r.status, "");
        return res.status(status).json({ error: code, message: code === "modelo_indisponivel" ? "O modelo de voz não está disponível na sua conta (GROQ_STT_MODEL)." : message });
      }
      const json = await r.json();
      res.json({ text: typeof json.text === "string" ? json.text : "" });
    } catch (err) {
      console.error(`Falha na transcrição: ${err?.name === "TimeoutError" ? "timeout" : err?.message || err}`);
      res.status(502).json({ error: "ia_indisponivel", message: "Não consegui transcrever o áudio agora. Tente de novo." });
    }
  },
);

// Lista os modelos de chat que a SUA chave enxerga (para conferir o GROQ_MODEL).
app.get("/api/models", chatLimiter, async (_req, res) => {
  if (!GROQ_API_KEY) return res.status(503).json({ error: "servidor_sem_chave", message: "Sem GROQ_API_KEY." });
  try {
    const r = await fetch(`${GROQ_BASE_URL}/models`, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } });
    if (!r.ok) return res.status(502).json({ error: "ia_indisponivel", message: `A Groq respondeu ${r.status}.` });
    const json = await r.json();
    const ids = (json.data || []).map((m) => m.id).filter((id) => !/whisper|orpheus|guard|tts/i.test(id)).sort();
    res.json({ configured: GROQ_MODEL, available: ids, configuredIsAvailable: ids.includes(GROQ_MODEL) });
  } catch {
    res.status(502).json({ error: "ia_indisponivel", message: "Não consegui consultar a Groq." });
  }
});

app.use((_req, res) => res.status(404).json({ error: "nao_encontrado", message: "Rota não encontrada." }));
app.use((err, _req, res, _next) => {
  console.error("Erro interno:", err?.message || err);
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "grande_demais", message: "O envio ficou grande demais (áudio de até 10 MB)." });
  res.status(err?.status === 400 || err?.type === "entity.parse.failed" ? 400 : 500).json({ error: "erro_interno", message: "Requisição inválida ou erro interno." });
});

app.listen(PORT, () => {
  console.log(`Aethel A.M.I. backend ouvindo na porta ${PORT}`);
  console.log(`Modelo: ${GROQ_MODEL} | chave configurada: ${GROQ_API_KEY ? "sim" : "NÃO"}`);
  if (GROQ_API_KEY) {
    fetch(`${GROQ_BASE_URL}/models`, { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
      .then((j) => {
        const ids = (j.data || []).map((m) => m.id);
        if (!ids.includes(GROQ_MODEL)) console.warn(`ATENÇÃO: o modelo "${GROQ_MODEL}" não aparece na lista da sua chave. Rode "npm run models".`);
        else console.log("Modelo confirmado na lista da Groq.");
      })
      .catch((e) => console.warn(`Não consegui conferir os modelos agora (${e.message}).`));
  }
});
