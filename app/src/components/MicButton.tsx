import { useEffect, useRef, useState } from "react";
import { ApiError, transcribe } from "../services/api";

type Phase = "idle" | "recording" | "transcribing";
const MAX_MS = 60_000;

function micError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "O microfone está bloqueado. Libere em Configurações do Windows > Privacidade e segurança > Microfone e tente de novo.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Não encontrei nenhum microfone neste computador.";
  if (name === "NotReadableError") return "O microfone está sendo usado por outro programa.";
  return "Não consegui abrir o microfone.";
}

/** Grava a voz, manda ao backend (Whisper) e devolve o texto. */
export function MicButton({ onText, onError }: { onText: (t: string) => void; onError: (m: string) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gone = useRef(false);
  const cbs = useRef({ onText, onError });
  cbs.current = { onText, onError };

  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
      clearTimeout(timer.current);
      const r = recRef.current;
      if (r && r.state !== "inactive") r.stop();
    };
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      cbs.current.onError("Este ambiente não permite gravar áudio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      cbs.current.onError(micError(e));
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((t) =>
      MediaRecorder.isTypeSupported(t),
    );
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    rec.ondataavailable = (ev) => {
      if (ev.data.size) chunks.current.push(ev.data);
    };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearTimeout(timer.current);
      if (gone.current) return;
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      if (blob.size < 1500) {
        setPhase("idle");
        cbs.current.onError("Não ouvi nada. Fale mais perto do microfone e tente de novo.");
        return;
      }
      setPhase("transcribing");
      transcribe(blob, new AbortController().signal)
        .then((t) => {
          if (t.trim()) cbs.current.onText(t.trim());
          else cbs.current.onError("Não entendi o áudio. Tente de novo.");
        })
        .catch((e) => cbs.current.onError(e instanceof ApiError ? e.message : "Falha ao transcrever o áudio."))
        .finally(() => !gone.current && setPhase("idle"));
    };
    recRef.current = rec;
    rec.start();
    setPhase("recording");
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_MS);
  };

  const click = () => {
    if (phase === "idle") void start();
    else if (phase === "recording") recRef.current?.stop();
  };

  return (
    <button
      type="button"
      className={`mic${phase === "recording" ? " rec" : ""}`}
      onClick={click}
      disabled={phase === "transcribing"}
      aria-label={phase === "recording" ? "Parar gravação" : "Falar com o microfone"}
      title={phase === "recording" ? "Clique para parar e transcrever" : "Falar com o microfone"}
    >
      {phase === "recording" ? "● Gravando… (clique para parar)" : phase === "transcribing" ? "Transcrevendo…" : "🎤 Falar"}
    </button>
  );
}
