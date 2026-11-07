import { THEMES } from "../themes/themes";
import { useSettings } from "../store/settings";

export function AppearancePage() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const introEnabled = useSettings((s) => s.introEnabled);
  const setIntroEnabled = useSettings((s) => s.setIntroEnabled);
  const replayIntro = useSettings((s) => s.replayIntro);

  return (
    <div className="page">
      <h1>Aparência</h1>
      <p className="lead">Escolha um tema. A mudança é imediata e fica salva para a próxima vez que você abrir o app.</p>

      <div className="themes">
        {THEMES.map((t) => (
          <button key={t.id} className="theme-card" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
            <div className="preview" style={{ background: t.preview.bg }}>
              <div className="p-side" style={{ background: t.preview.side }}>
                <i style={{ background: t.preview.a, width: "70%" }} />
                <i style={{ background: t.preview.text }} />
                <i style={{ background: t.preview.text, width: "60%" }} />
              </div>
              <div className="p-main">
                <div className="p-bubble" style={{ background: t.preview.c }} />
                <div className="p-bubble" style={{ background: t.preview.b, alignSelf: "flex-end" }} />
                <i style={{ background: t.preview.a, height: 12, borderRadius: 6 }} />
              </div>
            </div>
            <b>{t.name}</b>
            <small>{t.description}</small>
          </button>
        ))}
      </div>

      <h2 className="section-title">Introdução de abertura</h2>
      <label className="opt-row">
        <span>
          Mostrar a introdução ao abrir o app
          <small>Se o Windows estiver com "reduzir movimento" ligado, ela é pulada automaticamente.</small>
        </span>
        <input type="checkbox" checked={introEnabled} onChange={(e) => setIntroEnabled(e.target.checked)} />
      </label>
      <div className="opt-row">
        <span>Ver a introdução agora</span>
        <button className="opt-btn" onClick={replayIntro}>Reproduzir</button>
      </div>
    </div>
  );
}
