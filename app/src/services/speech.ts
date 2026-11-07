/** Leitura em voz alta com as vozes do próprio Windows (speechSynthesis). */
const synth: SpeechSynthesis | undefined = typeof window !== "undefined" ? window.speechSynthesis : undefined;
export const speechSupported = Boolean(synth);

let currentKey: string | null = null;
let session = 0;
const listeners = new Set<() => void>();
const setKey = (k: string | null) => {
  if (currentKey !== k) {
    currentKey = k;
    listeners.forEach((l) => l());
  }
};
export const subscribeSpeaking = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
/** Identificador do que está sendo lido agora (ou null). */
export const getSpeakingKey = () => currentKey;

/** Tira Markdown e LaTeX para a leitura não soletrar símbolos. */
export function cleanForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " (bloco de código) ")
    .replace(/\$\$[\s\S]*?\$\$/g, " (fórmula) ")
    .replace(/\$[^$\n]+\$/g, " (fórmula) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_~>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Textos longos travam em alguns motores de voz: lê em pedaços de frase.
function chunk(text: string, max = 220): string[] {
  const out: string[] = [];
  let cur = "";
  for (const s of text.split(/(?<=[.!?…:;])\s+/)) {
    if ((cur + " " + s).trim().length > max && cur) {
      out.push(cur.trim());
      cur = s;
    } else cur = (cur + " " + s).trim();
  }
  if (cur.trim()) out.push(cur.trim());
  return out.flatMap((p) => (p.length > max * 2 ? (p.match(new RegExp(`.{1,${max}}`, "g")) ?? [p]) : [p]));
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([]);
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1500);
  });
}

export function stopSpeaking() {
  session++;
  try {
    synth?.cancel();
  } catch {
    /* motor de voz com problema: ignora, o app segue funcionando */
  }
  setKey(null);
}

export function speak(text: string, opts: { voiceURI: string; rate: number }, key = "geral") {
  if (!synth) return;
  stopSpeaking();
  const parts = chunk(cleanForSpeech(text));
  if (parts.length === 0) return;
  const mine = ++session;
  setKey(key);
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.voiceURI === opts.voiceURI) ??
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === "pt-br") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("pt"));
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = voice?.lang ?? "pt-BR";
    if (voice) u.voice = voice;
    u.rate = opts.rate;
    u.onend = () => {
      if (mine === session && i === parts.length - 1) setKey(null);
    };
    u.onerror = () => {
      if (mine === session) setKey(null);
    };
    try {
      synth.speak(u);
    } catch {
      // Um motor de voz que falha não pode derrubar o app.
      if (mine === session) setKey(null);
    }
  });
}
