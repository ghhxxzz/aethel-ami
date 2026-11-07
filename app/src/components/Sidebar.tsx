import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { useChat } from "../store/chat";
import type { Conversation } from "../store/chat";
import "../styles/pages.css";

function ConvItem({ c, active }: { c: Conversation; active: boolean }) {
  const navigate = useNavigate();
  const open = useChat((s) => s.open);
  const rename = useChat((s) => s.rename);
  const remove = useChat((s) => s.remove);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [confirm, setConfirm] = useState(false);

  const commit = () => {
    rename(c.id, title);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="conv editing">
        <input
          autoFocus
          value={title}
          aria-label="Novo nome da conversa"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      </div>
    );
  }
  if (confirm) {
    return (
      <div className="conv confirm">
        <span>Apagar?</span>
        <button onClick={() => remove(c.id)}>Sim</button>
        <button onClick={() => setConfirm(false)}>Não</button>
      </div>
    );
  }
  return (
    <div className={`conv${active ? " active" : ""}`}>
      <button
        className="conv-title"
        title={c.title}
        onClick={() => {
          open(c.id);
          navigate("/");
        }}
      >
        {c.title}
      </button>
      <span className="conv-actions">
        <button
          aria-label="Renomear"
          title="Renomear"
          onClick={() => {
            setTitle(c.title);
            setEditing(true);
          }}
        >
          ✎
        </button>
        <button aria-label="Apagar" title="Apagar" onClick={() => setConfirm(true)}>
          ✕
        </button>
      </span>
    </div>
  );
}

export function Sidebar() {
  const newChat = useChat((s) => s.newChat);
  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const navigate = useNavigate();

  return (
    <aside className="side">
      <div className="brand">
        <Logo size={34} />
        <div>
          <b>Aethel A.M.I.</b>
          <small>versão 0.1 (em construção)</small>
        </div>
      </div>

      <button
        className="new-chat"
        onClick={() => {
          newChat();
          navigate("/");
        }}
      >
        + <span>Nova conversa</span>
      </button>

      <nav className="nav" aria-label="Principal">
        <NavLink to="/" end>
          <span className="t">Conversa</span>
        </NavLink>
        <NavLink to="/matematica">
          <span className="t">Matemática</span>
        </NavLink>
        <NavLink to="/geometria">
          <span className="t">Geometria</span>
        </NavLink>
        <NavLink to="/memoria">
          <span className="t">Memória</span>
        </NavLink>
        <NavLink to="/voz">
          <span className="t">Voz</span>
        </NavLink>
        <NavLink to="/aparencia">
          <span className="t">Aparência</span>
        </NavLink>
      </nav>

      <div className="convs" aria-label="Histórico de conversas">
        <div className="convs-head">Histórico</div>
        {conversations.length === 0 && <p className="convs-empty">Nenhuma conversa ainda.</p>}
        {conversations.map((c) => (
          <ConvItem key={c.id} c={c} active={c.id === activeId} />
        ))}
      </div>
    </aside>
  );
}
