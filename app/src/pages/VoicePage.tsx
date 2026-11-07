import { useEffect, useState } from "react";
import { MicButton } from "../components/MicButton";
import { useVoice } from "../store/voice";
import { loadVoices, speak, speechSupported, stopSpeaking } from "../services/speech";
import "../styles/pages.css";
import "../styles/voice.css";

export function VoicePage() {
  const autoRead = useVoice((s) => s.autoRead);
  const voiceURI = useVoice((s) => s.voiceURI);
  const rate = useVoice((s) => s.rate);
  const setAutoRead = useVoice((s) => s.setAutoRead);
  const setVoiceURI = useVoice((s) => s.setVoiceURI);
  const setRate = useVoice((s) => s.setRate);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [heard, setHeard] = useState("");
  const [micMsg, setMicMsg] = useState("");

  useEffect(() => {
    void loadVoices().then(setVoices);
    return () => stopSpeaking();
  }, []);

  const pt = voices.filter((v) => v.lang.toLowerCase().startsWith("pt"));
  const others = voices.filter((v) => !v.lang.toLowerCase().startsWith("pt"));

  return (
    <div className="page">
      <h1>Voz</h1>
      <p className="lead">
        Falar com o microfone e ouvir as respostas. O áudio gravado é enviado ao seu servidor e de lá à Groq só para virar
        texto; ele não fica salvo.
      </p>

      <h2 className="section-title">Ouvir as respostas</h2>
      {!speechSupported ? (
        <p className="lead">Este ambiente não tem leitura em voz alta.</p>
      ) : (
        <>
          <label className="opt-row">
            <span>
              Ler a resposta em voz alta quando ela terminar
              <small>Você também pode clicar em Ouvir em cada resposta.</small>
            </span>
            <input type="checkbox" checked={autoRead} onChange={(e) => setAutoRead(e.target.checked)} />
          </label>

          <div className="opt-row">
            <span>Voz</span>
            <select value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} aria-label="Voz">
              <option value="">Automática (português)</option>
              {pt.length > 0 && (
                <optgroup label="Português">
                  {pt.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                </optgroup>
              )}
              {others.length > 0 && (
                <optgroup label="Outros idiomas">
                  {others.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </optgroup>
              )}
            </select>
          </div>
          {voices.length === 0 && <p className="mem-msg">Nenhuma voz encontrada. Instale vozes em Configurações do Windows → Hora e idioma → Fala.</p>}
          {voices.length > 0 && pt.length === 0 && (
            <p className="mem-msg">Nenhuma voz em português instalada; instale uma em Configurações do Windows → Hora e idioma → Fala.</p>
          )}

          <div className="opt-row">
            <span>Velocidade: {rate.toFixed(1)}x</span>
            <input type="range" min={0.7} max={1.4} step={0.1} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Velocidade da fala" />
          </div>
          <div className="opt-row">
            <span>Testar a voz</span>
            <button className="opt-btn" onClick={() => speak("Olá! Eu sou o Aethel A.M.I. Assim é a minha voz.", { voiceURI, rate }, "teste")}>
              Ouvir exemplo
            </button>
          </div>
        </>
      )}

      <h2 className="section-title">Microfone</h2>
      <div className="opt-row">
        <span>
          Testar o microfone
          <small>Grave uma frase curta; o texto reconhecido aparece abaixo.</small>
        </span>
        <MicButton onText={(t) => { setMicMsg(""); setHeard(t); }} onError={(m) => { setHeard(""); setMicMsg(m); }} />
      </div>
      {heard && <p className="heard">“{heard}”</p>}
      {micMsg && <p className="mem-msg" role="alert">{micMsg}</p>}
    </div>
  );
}
