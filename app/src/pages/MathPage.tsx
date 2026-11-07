import { useState } from "react";
import { TOPICS } from "../components/math/Calculators";
import "../styles/pages.css";
import "../styles/math.css";

export function MathPage() {
  const [id, setId] = useState(TOPICS[0].id);
  const topic = TOPICS.find((t) => t.id === id) ?? TOPICS[0];
  return (
    <div className="page">
      <h1>Matemática</h1>
      <p className="lead">Calculadoras com passo a passo. As contas são feitas aqui no seu computador; o botão "Explicar com a IA" abre uma conversa pedindo a explicação.</p>
      <div className="topics" role="tablist" aria-label="Assuntos">
        {TOPICS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === id} className="topic" onClick={() => setId(t.id)}>{t.name}</button>
        ))}
      </div>
      <section className="topic-body" role="tabpanel" key={topic.id}>
        <h2 className="section-title">{topic.name}</h2>
        {topic.view()}
      </section>
    </div>
  );
}
