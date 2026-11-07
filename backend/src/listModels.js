// Uso:  npm run models   -> mostra os modelos de chat que a sua chave pode usar.
import "dotenv/config";

const key = process.env.GROQ_API_KEY;
const base = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
if (!key) { console.error("Falta GROQ_API_KEY no arquivo backend\\.env"); process.exit(1); }

const r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
if (!r.ok) { console.error(`A Groq respondeu ${r.status}. Confira a chave.`); process.exit(1); }
const ids = ((await r.json()).data || []).map((m) => m.id).filter((id) => !/whisper|orpheus|guard|tts/i.test(id)).sort();
console.log("Modelos de chat disponíveis para a sua chave:\n");
ids.forEach((id) => console.log("  " + id));
console.log(`\nConfigurado agora: ${process.env.GROQ_MODEL || "openai/gpt-oss-120b"}`);
