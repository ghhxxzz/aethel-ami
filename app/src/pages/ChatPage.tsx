import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "../components/Logo";
import { Markdown } from "../components/Markdown";
import { MicButton } from "../components/MicButton";
import { useChat } from "../store/chat";
import type { Msg } from "../store/chat";
import { useVoice } from "../store/voice";
import { getSpeakingKey, speak, speechSupported, stopSpeaking, subscribeSpeaking } from "../services/speech";
import "../styles/chat.css";
import "../styles/voice.css";

const EMPTY: Msg[] = [];

export function ChatPage() {
  const messages = useChat((s) => s.conversations.find((c) => c.id === s.activeId)?.messages ?? EMPTY);
  const busy = useChat((s) => s.busy);
  const notice = useChat((s) => s.notice);
  const send = useChat((s) => s.send);
  const stop = useChat((s) => s.stop);
  const retry = useChat((s) => s.retry);
  const autoRead = useVoice((s) => s.autoRead);
  const voiceURI = useVoice((s) => s.voiceURI);
  const rate = useVoice((s) => s.rate);
  const speakingKey = useSyncExternalStore(subscribeSpeaking, getSpeakingKey);
  const [text, setText] = useState("");
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevBusy = useRef(false);
  const stopped = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // Quando a resposta termina (sem erro e sem ter sido interrompida), lê em voz alta se estiver ligado.
  useEffect(() => {
    if (prevBusy.current && !busy && autoRead && !stopped.current) {
      const m = messages[messages.length - 1];
      if (m?.role === "assistant" && m.content && !m.error) speak(m.content, { voiceURI, rate }, m.id);
    }
    if (!busy) stopped.current = false;
    prevBusy.current = busy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  // Sair da tela de conversa para a leitura.
  useEffect(() => () => stopSpeaking(), []);

  const submit = () => {
    if (!text.trim() || busy) return;
    stopSpeaking();
    send(text);
    setText("");
  };

  const flash = (m: string) => {
    setVoiceMsg(m);
    setTimeout(() => setVoiceMsg(null), 7000);
  };

  const last = messages[messages.length - 1];
  const thinking = busy && last?.role === "assistant" && last.content === "" && !last.error;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!thinking) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(t);
  }, [thinking]);

  return (
    <div className="chat">
      {messages.length === 0 ? (
        <div className="chat-empty">
          <Logo size={64} />
          <h2>Como posso ajudar?</h2>
          <p>Pergunte qualquer coisa, peça uma explicação, um exercício de matemática ou ajuda com código.</p>
          <p className="hint">Dica: escreva <code>/lembrar</code> e um fato para salvá-lo na memória, ou use o botão Falar.</p>
        </div>
      ) : (
        <div className="msgs" role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              {m.role === "user" ? (
                <div className="bubble user-bubble">{m.content}</div>
              ) : (
                <div className="bubble ai-bubble">
                  {m.content !== "" && <Markdown text={m.content} />}
                  {m.error && (
                    <div className="err">
                      <span>{m.error}</span>
                      <button onClick={retry} disabled={busy}>Tentar de novo</button>
                    </div>
                  )}
                  {m.content !== "" && speechSupported && !(busy && m === last) && (
                    <button
                      className="listen"
                      onClick={() => (speakingKey === m.id ? stopSpeaking() : speak(m.content, { voiceURI, rate }, m.id))}
                    >
                      {speakingKey === m.id ? "■ Parar leitura" : "🔊 Ouvir"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="msg assistant">
              <div className="bubble ai-bubble" aria-label="Pensando">
                <span className="dots"><i /><i /><i /></span>
                {slow && (
                  <small style={{ display: "block", marginTop: 6, color: "var(--text-dim)", fontSize: 13 }}>
                    Ainda trabalhando… se o servidor estava parado, a primeira resposta pode levar até 1 minuto.
                  </small>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {(voiceMsg ?? notice) && <div className="notice" role="status">{voiceMsg ?? notice}</div>}

      <div className="composer">
        <textarea
          value={text}
          rows={1}
          placeholder="Escreva sua mensagem (Enter envia, Shift+Enter quebra a linha)"
          aria-label="Mensagem"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <MicButton onText={(t) => setText((p) => (p.trim() ? p.trim() + " " + t : t))} onError={flash} />
        {busy ? (
          <button
            className="stop"
            onClick={() => {
              stopped.current = true;
              stop();
            }}
          >
            Parar
          </button>
        ) : (
          <button onClick={submit} disabled={!text.trim()}>Enviar</button>
        )}
      </div>
    </div>
  );
}
