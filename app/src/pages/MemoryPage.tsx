import { useState } from "react";
import { MAX_CHARS, MAX_ITEMS, useMemory } from "../store/memory";
import { useChat } from "../store/chat";
import "../styles/pages.css";

export function MemoryPage() {
  const enabled = useMemory((s) => s.enabled);
  const items = useMemory((s) => s.items);
  const setEnabled = useMemory((s) => s.setEnabled);
  const add = useMemory((s) => s.add);
  const remove = useMemory((s) => s.remove);
  const clearMemory = useMemory((s) => s.clear);
  const total = useChat((s) => s.conversations.length);
  const clearAll = useChat((s) => s.clearAll);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [askMem, setAskMem] = useState(false);
  const [askHist, setAskHist] = useState(false);

  const save = () => {
    const r = add(text);
    if (r === "ok") {
      setText("");
      setMsg("Salvo.");
    } else setMsg(r === "limite" ? `A memória está cheia (${MAX_ITEMS} itens).` : "Escreva algo para salvar.");
  };

  return (
    <div className="page">
      <h1>Memória e histórico</h1>
      <p className="lead">
        Tudo aqui fica salvo só neste computador, no armazenamento do aplicativo. Com a memória ligada, os itens abaixo
        são enviados junto com a conversa ao servidor da IA para ela poder usá-los. Com ela desligada, nada disso é enviado.
      </p>

      <h2 className="section-title">Memória</h2>
      <label className="opt-row">
        <span>
          Usar a memória nas conversas
          <small>Os itens continuam salvos mesmo desligada.</small>
        </span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </label>

      <div className="mem-add">
        <input
          value={text}
          maxLength={MAX_CHARS}
          placeholder="Ex.: Prefiro explicações curtas, com exemplos."
          aria-label="Novo item de memória"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <button className="opt-btn" onClick={save}>Salvar</button>
      </div>
      {msg && <p className="mem-msg" role="status">{msg}</p>}

      {items.length === 0 ? (
        <p className="lead">Nada salvo ainda. Você também pode escrever /lembrar e um fato no chat.</p>
      ) : (
        <ul className="mem-list">
          {items.map((i) => (
            <li key={i.id}>
              <span>{i.text}</span>
              <button className="opt-btn" onClick={() => remove(i.id)}>Apagar</button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 &&
        (askMem ? (
          <div className="opt-row">
            <span>Apagar toda a memória?</span>
            <span>
              <button className="opt-btn" onClick={() => { clearMemory(); setAskMem(false); }}>Sim, apagar</button>{" "}
              <button className="opt-btn" onClick={() => setAskMem(false)}>Cancelar</button>
            </span>
          </div>
        ) : (
          <button className="opt-btn" onClick={() => setAskMem(true)}>Apagar toda a memória</button>
        ))}

      <h2 className="section-title">Histórico</h2>
      <p className="lead">{total === 0 ? "Nenhuma conversa salva." : `${total} conversa(s) salva(s).`}</p>
      {total > 0 &&
        (askHist ? (
          <div className="opt-row">
            <span>Apagar todas as conversas? Não dá para desfazer.</span>
            <span>
              <button className="opt-btn" onClick={() => { clearAll(); setAskHist(false); }}>Sim, apagar</button>{" "}
              <button className="opt-btn" onClick={() => setAskHist(false)}>Cancelar</button>
            </span>
          </div>
        ) : (
          <button className="opt-btn" onClick={() => setAskHist(true)}>Limpar histórico</button>
        ))}
    </div>
  );
}
