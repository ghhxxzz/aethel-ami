import { useEffect, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Intro } from "./intro/Intro";
import { ChatPage } from "./pages/ChatPage";
import { AppearancePage } from "./pages/AppearancePage";
import { MemoryPage } from "./pages/MemoryPage";
import { VoicePage } from "./pages/VoicePage";
import { MathPage } from "./pages/MathPage";
import { GeometryPage } from "./pages/GeometryPage";
import { useSettings } from "./store/settings";
import { wakeServer } from "./services/api";

export default function App() {
  const theme = useSettings((s) => s.theme);
  const introEnabled = useSettings((s) => s.introEnabled);
  const introNonce = useSettings((s) => s.introNonce);
  const [showIntro, setShowIntro] = useState(introEnabled);

  // Aplica o tema no <html>; todos os componentes leem as variáveis CSS.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Acorda o servidor (plano gratuito do Render dorme quando fica parado) enquanto a introdução toca.
  useEffect(() => {
    wakeServer();
  }, []);

  // "Reproduzir" nas configurações dispara a introdução de novo.
  useEffect(() => {
    if (introNonce > 0) setShowIntro(true);
  }, [introNonce]);

  return (
    <>
      <HashRouter>
        <div className="app">
          <Sidebar />
          <main className="main">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/aparencia" element={<AppearancePage />} />
              <Route path="/memoria" element={<MemoryPage />} />
              <Route path="/voz" element={<VoicePage />} />
              <Route path="/matematica" element={<MathPage />} />
              <Route path="/geometria" element={<GeometryPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}
    </>
  );
}
