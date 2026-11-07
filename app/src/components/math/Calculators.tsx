import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Tex } from "../Tex";
import { useAskAI } from "../../hooks/useAskAI";
import { compile } from "../../lib/expr";
import * as M from "../../lib/mathTools";
import { fmt, num, pn, tn } from "../../lib/mathTools";
import { Plane } from "../geometry/Plane";

function Field({ label, value, onChange, wide }: { label: string; value: string; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      <input value={value} inputMode="decimal" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Out({ children }: { children: ReactNode }) {
  return <div className="out">{children}</div>;
}
function Warn({ children }: { children: ReactNode }) {
  return <p className="warn" role="status">{children}</p>;
}
function Ask({ prompt }: { prompt: string }) {
  const ask = useAskAI();
  return <button className="opt-btn ask" onClick={() => ask(prompt)}>Explicar com a IA</button>;
}

/* ---------- Equações ---------- */
function Equations() {
  const [a, setA] = useState("1"), [b, setB] = useState("-5"), [c, setC] = useState("6");
  const A = num(a), B = num(b), C = num(c);
  const ok = [A, B, C].every(Number.isFinite);
  const prompt = `Resolva a equação ${fmt(A)}x² ${B < 0 ? "-" : "+"} ${fmt(Math.abs(B))}x ${C < 0 ? "-" : "+"} ${fmt(Math.abs(C))} = 0 passo a passo e confira o resultado.`;
  let body: ReactNode = <Warn>Preencha a, b e c com números.</Warn>;
  if (ok) {
    const r = M.solveQuadratic(A, B, C);
    const eq = `${tn(A)}x^2 ${B < 0 ? "-" : "+"} ${tn(Math.abs(B))}x ${C < 0 ? "-" : "+"} ${tn(Math.abs(C))} = 0`;
    if (r.kind === "degenerate") body = <Warn>{r.all ? "Infinitas soluções (0 = 0)." : "Sem solução (0 = número diferente de zero)."}</Warn>;
    else if (r.kind === "linear")
      body = <Out><Tex block tex={`${tn(B)}x ${C < 0 ? "-" : "+"} ${tn(Math.abs(C))} = 0 \\;\\Rightarrow\\; x = \\frac{-(${pn(C)})}{${tn(B)}} = ${tn(r.x)}`} /></Out>;
    else {
      body = (
        <Out>
          <Tex block tex={eq} />
          <Tex block tex={`\\Delta = b^2 - 4ac = ${pn(B)}^2 - 4\\cdot ${pn(A)}\\cdot ${pn(C)} = ${tn(r.delta)}`} />
          {r.kind === "two" && <Tex block tex={`x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} \\;\\Rightarrow\\; x_1 = ${tn(r.x1)}, \\quad x_2 = ${tn(r.x2)}`} />}
          {r.kind === "one" && <Tex block tex={`\\Delta = 0 \\;\\Rightarrow\\; x = \\frac{-b}{2a} = ${tn(r.x)}`} />}
          {r.kind === "complex" && (
            <>
              <Warn>Δ &lt; 0: não há raízes reais.</Warn>
              <Tex block tex={`x = ${tn(r.re)} \\pm ${tn(r.im)}\\,i`} />
            </>
          )}
        </Out>
      );
    }
  }
  return (
    <>
      <p className="hint">Resolve <Tex tex="ax^2 + bx + c = 0" />. Com a = 0 vira equação do 1º grau.</p>
      <div className="fields"><Field label="a" value={a} onChange={setA} /><Field label="b" value={b} onChange={setB} /><Field label="c" value={c} onChange={setC} /></div>
      {body}{ok && <Ask prompt={prompt} />}
    </>
  );
}

/* ---------- Frações ---------- */
function Fractions() {
  const [n1, setN1] = useState("1"), [d1, setD1] = useState("2"), [n2, setN2] = useState("1"), [d2, setD2] = useState("3");
  const [op, setOp] = useState<"+" | "-" | "*" | "/">("+");
  const v = [n1, d1, n2, d2].map(num);
  const ok = v.every((x) => Number.isInteger(x));
  const sym = { "+": "+", "-": "-", "*": "\\times", "/": "\\div" }[op];
  let body: ReactNode = <Warn>Use números inteiros nos numeradores e denominadores.</Warn>;
  if (ok) {
    if (v[1] === 0 || v[3] === 0) body = <Warn>Denominador não pode ser zero.</Warn>;
    else {
      const r = M.fractionOp(v[0], v[1], v[2], v[3], op);
      if (!r.simple) body = <Warn>Divisão por zero.</Warn>;
      else {
        const dec = r.simple.n / r.simple.d;
        body = (
          <Out>
            <Tex block tex={`\\frac{${v[0]}}{${v[1]}} ${sym} \\frac{${v[2]}}{${v[3]}} = \\frac{${r.raw.n}}{${r.raw.d}} = \\frac{${r.simple.n}}{${r.simple.d}} \\approx ${tn(dec)}`} />
          </Out>
        );
      }
    }
  }
  return (
    <>
      <div className="fields">
        <Field label="Numerador 1" value={n1} onChange={setN1} /><Field label="Denominador 1" value={d1} onChange={setD1} />
        <select value={op} onChange={(e) => setOp(e.target.value as typeof op)} aria-label="Operação">
          <option value="+">+</option><option value="-">−</option><option value="*">×</option><option value="/">÷</option>
        </select>
        <Field label="Numerador 2" value={n2} onChange={setN2} /><Field label="Denominador 2" value={d2} onChange={setD2} />
      </div>
      {body}
      {ok && <Ask prompt={`Calcule ${v[0]}/${v[1]} ${op === "*" ? "×" : op === "/" ? "÷" : op} ${v[2]}/${v[3]} e explique o passo a passo.`} />}
    </>
  );
}

/* ---------- Potenciação ---------- */
function Powers() {
  const [b, setB] = useState("2"), [e, setE] = useState("10");
  const B = num(b), E = num(e);
  const r = Math.pow(B, E);
  const ok = Number.isFinite(B) && Number.isFinite(E);
  return (
    <>
      <div className="fields"><Field label="Base" value={b} onChange={setB} /><Field label="Expoente" value={e} onChange={setE} /></div>
      {!ok ? <Warn>Preencha a base e o expoente.</Warn> : Number.isNaN(r) ? <Warn>Esse resultado não é um número real.</Warn> : (
        <Out>
          <Tex block tex={`${pn(B)}^{${tn(E)}} = ${tn(r, 10)}`} />
          {E < 0 && <Tex block tex={`${pn(B)}^{${tn(E)}} = \\frac{1}{${pn(B)}^{${tn(-E)}}}`} />}
        </Out>
      )}
      {ok && !Number.isNaN(r) && <Ask prompt={`Explique como calcular ${fmt(B)} elevado a ${fmt(E)} e as propriedades da potenciação usadas.`} />}
    </>
  );
}

/* ---------- Radiciação ---------- */
function Roots() {
  const [x, setX] = useState("72"), [n, setN] = useState("2");
  const X = num(x), N = num(n);
  const ok = Number.isFinite(X) && Number.isInteger(N) && N >= 2;
  const r = ok ? M.nthRoot(X, N) : NaN;
  const idx = N === 2 ? "" : `[${N}]`;
  let extra: ReactNode = null;
  if (ok && Number.isInteger(X) && X > 0) {
    const s = M.simplifyRadical(X, N);
    if (s.k > 1 && s.r > 1) extra = <Tex block tex={`\\sqrt${idx}{${X}} = ${s.k}\\sqrt${idx}{${s.r}}`} />;
  }
  return (
    <>
      <div className="fields"><Field label="Radicando" value={x} onChange={setX} /><Field label="Índice" value={n} onChange={setN} /></div>
      {!ok ? <Warn>O índice precisa ser um inteiro maior ou igual a 2.</Warn> : Number.isNaN(r) ? <Warn>Não existe raiz real de índice par de um número negativo.</Warn> : (
        <Out><Tex block tex={`\\sqrt${idx}{${pn(X)}} = ${tn(r, 8)}`} />{extra}</Out>
      )}
      {ok && !Number.isNaN(r) && <Ask prompt={`Explique como calcular a raiz de índice ${N} de ${fmt(X)} e como simplificar radicais.`} />}
    </>
  );
}

/* ---------- Porcentagem ---------- */
function Percent() {
  const [mode, setMode] = useState("of");
  const [p, setP] = useState("15"), [v, setV] = useState("200");
  const P = num(p), V = num(v);
  const ok = Number.isFinite(P) && Number.isFinite(V);
  let body: ReactNode = <Warn>Preencha os dois campos.</Warn>;
  let q = "";
  if (ok) {
    if (mode === "of") {
      const r = M.percentOf(P, V);
      body = <Out><Tex block tex={`${tn(P)}\\% \\text{ de } ${tn(V)} = \\frac{${tn(P)}}{100}\\cdot ${tn(V)} = ${tn(r)}`} /></Out>;
      q = `Quanto é ${fmt(P)}% de ${fmt(V)}?`;
    } else if (mode === "which") {
      if (V === 0) body = <Warn>O total não pode ser zero.</Warn>;
      else { const r = M.whatPercent(P, V); body = <Out><Tex block tex={`\\frac{${tn(P)}}{${tn(V)}} \\cdot 100 = ${tn(r)}\\%`} /></Out>; q = `${fmt(P)} é quantos por cento de ${fmt(V)}?`; }
    } else {
      const up = mode === "up";
      const r = M.changeBy(V, P, up);
      body = <Out><Tex block tex={`${tn(V)} \\cdot (1 ${up ? "+" : "-"} \\tfrac{${tn(P)}}{100}) = ${tn(r)}`} /></Out>;
      q = `${up ? "Aumentando" : "Descontando"} ${fmt(P)}% sobre ${fmt(V)}, qual é o resultado?`;
    }
  }
  return (
    <>
      <div className="fields">
        <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Tipo de cálculo">
          <option value="of">X% de Y</option><option value="which">X é quantos % de Y</option>
          <option value="up">Aumento de X% sobre Y</option><option value="down">Desconto de X% sobre Y</option>
        </select>
        <Field label={mode === "which" ? "X (parte)" : "X (%)"} value={p} onChange={setP} />
        <Field label={mode === "which" ? "Y (total)" : "Y (valor)"} value={v} onChange={setV} />
      </div>
      {body}{q && <Ask prompt={q + " Explique o raciocínio."} />}
    </>
  );
}

/* ---------- Regra de três ---------- */
function RuleThree() {
  const [a, setA] = useState("2"), [b, setB] = useState("10"), [c, setC] = useState("5");
  const [inv, setInv] = useState(false);
  const A = num(a), B = num(b), C = num(c);
  const ok = [A, B, C].every(Number.isFinite) && A !== 0 && C !== 0;
  const x = ok ? M.ruleOfThree(A, B, C, inv) : NaN;
  return (
    <>
      <p className="hint">A está para B assim como C está para X.</p>
      <div className="fields">
        <Field label="A" value={a} onChange={setA} /><Field label="B" value={b} onChange={setB} /><Field label="C" value={c} onChange={setC} />
        <select value={inv ? "i" : "d"} onChange={(e) => setInv(e.target.value === "i")} aria-label="Tipo">
          <option value="d">Diretamente proporcional</option><option value="i">Inversamente proporcional</option>
        </select>
      </div>
      {!ok ? <Warn>Preencha números diferentes de zero em A e C.</Warn> : (
        <Out>
          <Tex block tex={inv ? `${tn(A)}\\cdot ${tn(B)} = ${tn(C)} \\cdot x \\;\\Rightarrow\\; x = ${tn(x)}` : `\\frac{${tn(A)}}{${tn(C)}} = \\frac{${tn(B)}}{x} \\;\\Rightarrow\\; x = \\frac{${tn(B)}\\cdot ${tn(C)}}{${tn(A)}} = ${tn(x)}`} />
        </Out>
      )}
      {ok && <Ask prompt={`Resolva por regra de três ${inv ? "inversa" : "direta"}: ${fmt(A)} está para ${fmt(B)} assim como ${fmt(C)} está para x. Explique o passo a passo.`} />}
    </>
  );
}

/* ---------- Funções (tabela de valores) ---------- */
function Functions() {
  const [src, setSrc] = useState("x^2 - 4");
  const [x0, setX0] = useState("-3"), [x1, setX1] = useState("3"), [st, setSt] = useState("1");
  let f: ((x: number) => number) | null = null;
  let err = "";
  try { f = compile(src); } catch (e) { err = (e as Error).message; }
  const X0 = num(x0), X1 = num(x1), S = num(st);
  const okRange = [X0, X1, S].every(Number.isFinite) && S > 0 && X1 >= X0 && (X1 - X0) / S <= 200;
  const rows: [number, number][] = [];
  if (f && okRange) for (let x = X0; x <= X1 + 1e-9; x += S) rows.push([Math.round(x * 1e9) / 1e9, f(x)]);
  return (
    <>
      <p className="hint">Use x, + − * / ^, parênteses e funções como sin(x), sqrt(x), abs(x), ln(x). Ângulos em radianos.</p>
      <div className="fields"><Field wide label="f(x) =" value={src} onChange={setSrc} /></div>
      <div className="fields"><Field label="x inicial" value={x0} onChange={setX0} /><Field label="x final" value={x1} onChange={setX1} /><Field label="passo" value={st} onChange={setSt} /></div>
      {err && <Warn>{err}</Warn>}
      {!err && !okRange && <Warn>Confira o intervalo (passo maior que zero, até 200 linhas).</Warn>}
      {rows.length > 0 && (
        <div className="table-wrap"><table className="vtable"><thead><tr><th>x</th><th>f(x)</th></tr></thead>
          <tbody>{rows.map(([x, y]) => <tr key={x}><td>{fmt(x)}</td><td>{fmt(y, 6)}</td></tr>)}</tbody></table></div>
      )}
      {!err && <Ask prompt={`Analise a função f(x) = ${src}: domínio, raízes, sinal e comportamento. Explique o passo a passo.`} />}
    </>
  );
}

/* ---------- Sistemas ---------- */
function Systems() {
  const [v, setV] = useState(["1", "1", "5", "1", "-1", "1"]);
  const set = (i: number) => (s: string) => setV((o) => o.map((x, k) => (k === i ? s : x)));
  const [a1, b1, c1, a2, b2, c2] = v.map(num);
  const ok = [a1, b1, c1, a2, b2, c2].every(Number.isFinite);
  const r = ok ? M.solveSystem(a1, b1, c1, a2, b2, c2) : null;
  return (
    <>
      <p className="hint">Sistema <Tex tex="a_1x + b_1y = c_1" /> e <Tex tex="a_2x + b_2y = c_2" />, resolvido pela regra de Cramer.</p>
      <div className="fields"><Field label="a₁" value={v[0]} onChange={set(0)} /><Field label="b₁" value={v[1]} onChange={set(1)} /><Field label="c₁" value={v[2]} onChange={set(2)} /></div>
      <div className="fields"><Field label="a₂" value={v[3]} onChange={set(3)} /><Field label="b₂" value={v[4]} onChange={set(4)} /><Field label="c₂" value={v[5]} onChange={set(5)} /></div>
      {!r ? <Warn>Preencha os seis coeficientes.</Warn> : (
        <Out>
          <Tex block tex={`D = ${pn(a1)}\\cdot${pn(b2)} - ${pn(a2)}\\cdot${pn(b1)} = ${tn(r.D)},\\quad D_x = ${tn(r.Dx)},\\quad D_y = ${tn(r.Dy)}`} />
          {r.kind === "unique" && <Tex block tex={`x = \\frac{D_x}{D} = ${tn(r.x)},\\qquad y = \\frac{D_y}{D} = ${tn(r.y)}`} />}
          {r.kind === "none" && <Warn>Sistema impossível: não tem solução.</Warn>}
          {r.kind === "infinite" && <Warn>Sistema possível e indeterminado: infinitas soluções.</Warn>}
        </Out>
      )}
      {ok && <Ask prompt={`Resolva o sistema: ${fmt(a1)}x + ${fmt(b1)}y = ${fmt(c1)} e ${fmt(a2)}x + ${fmt(b2)}y = ${fmt(c2)}. Mostre o passo a passo.`} />}
    </>
  );
}

/* ---------- Geometria (fórmulas) ---------- */
function GeoFormulas() {
  const [shape, setShape] = useState("circulo");
  const [p, setP] = useState(["5", "4", "3"]);
  const set = (i: number) => (s: string) => setP((o) => o.map((x, k) => (k === i ? s : x)));
  const [u, w, z] = p.map(num);
  const labels: Record<string, string[]> = { circulo: ["raio"], retangulo: ["base", "altura"], triangulo: ["base", "altura"], quadrado: ["lado"], trapezio: ["base maior", "base menor", "altura"] };
  const L = labels[shape];
  const vals = [u, w, z].slice(0, L.length);
  const ok = vals.every((x) => Number.isFinite(x) && x > 0);
  let body: ReactNode = <Warn>Use valores maiores que zero.</Warn>;
  if (ok) {
    if (shape === "circulo") body = <Out><Tex block tex={`A = \\pi r^2 = ${tn(Math.PI * u * u)},\\qquad C = 2\\pi r = ${tn(2 * Math.PI * u)}`} /></Out>;
    if (shape === "retangulo") body = <Out><Tex block tex={`A = b\\cdot h = ${tn(u * w)},\\qquad P = 2(b+h) = ${tn(2 * (u + w))}`} /></Out>;
    if (shape === "triangulo") body = <Out><Tex block tex={`A = \\frac{b\\cdot h}{2} = ${tn((u * w) / 2)}`} /></Out>;
    if (shape === "quadrado") body = <Out><Tex block tex={`A = l^2 = ${tn(u * u)},\\qquad P = 4l = ${tn(4 * u)}`} /></Out>;
    if (shape === "trapezio") body = <Out><Tex block tex={`A = \\frac{(B+b)\\cdot h}{2} = ${tn(((u + w) * z) / 2)}`} /></Out>;
  }
  return (
    <>
      <div className="fields">
        <select value={shape} onChange={(e) => setShape(e.target.value)} aria-label="Figura">
          <option value="circulo">Círculo</option><option value="retangulo">Retângulo</option><option value="triangulo">Triângulo</option>
          <option value="quadrado">Quadrado</option><option value="trapezio">Trapézio</option>
        </select>
        {L.map((l, i) => <Field key={shape + l} label={l} value={p[i]} onChange={set(i)} />)}
      </div>
      {body}
      <p className="hint">Quer construir e medir figuras com o mouse? Abra a <Link to="/geometria">Geometria interativa</Link>.</p>
    </>
  );
}

/* ---------- Trigonometria ---------- */
function Trig() {
  const [ang, setAng] = useState("30");
  const [s, setS] = useState(["3", "4", ""]);
  const set = (i: number) => (v: string) => setS((o) => o.map((x, k) => (k === i ? v : x)));
  const A = num(ang);
  const r = M.rightTriangle(num(s[0]), num(s[1]), num(s[2]));
  const tanOk = Number.isFinite(A) && Math.abs(Math.cos(M.toRad(A))) > 1e-12;
  return (
    <>
      <h3>Seno, cosseno e tangente</h3>
      <div className="fields"><Field label="Ângulo (graus)" value={ang} onChange={setAng} /></div>
      {!Number.isFinite(A) ? <Warn>Preencha o ângulo.</Warn> : (
        <Out>
          <Tex block tex={`\\sin ${tn(A)}^\\circ = ${tn(Math.sin(M.toRad(A)), 8)},\\quad \\cos ${tn(A)}^\\circ = ${tn(Math.cos(M.toRad(A)), 8)}`} />
          <Tex block tex={tanOk ? `\\tan ${tn(A)}^\\circ = ${tn(Math.tan(M.toRad(A)), 8)}` : "\\tan \\text{ indefinida}"} />
          <Tex block tex={`${tn(A)}^\\circ = ${tn(M.toRad(A), 8)}\\text{ rad}`} />
        </Out>
      )}
      <h3>Triângulo retângulo</h3>
      <p className="hint">Preencha exatamente dois lados e deixe o terceiro vazio.</p>
      <div className="fields"><Field label="Cateto a" value={s[0]} onChange={set(0)} /><Field label="Cateto b" value={s[1]} onChange={set(1)} /><Field label="Hipotenusa c" value={s[2]} onChange={set(2)} /></div>
      {"error" in r ? <Warn>{r.error}</Warn> : (
        <Out>
          <Tex block tex={`a = ${tn(r.a)},\\; b = ${tn(r.b)},\\; c = ${tn(r.c)}`} />
          <Tex block tex={`\\hat A = ${tn(r.A, 4)}^\\circ,\\quad \\hat B = ${tn(r.B, 4)}^\\circ,\\quad \\text{área} = ${tn(r.area)},\\quad \\text{perímetro} = ${tn(r.perimeter)}`} />
        </Out>
      )}
      <Ask prompt={`Explique seno, cosseno e tangente e resolva um triângulo retângulo com catetos ${s[0] || "?"} e ${s[1] || "?"} e hipotenusa ${s[2] || "?"} (use o que estiver preenchido).`} />
    </>
  );
}

/* ---------- Estatística ---------- */
function Stats() {
  const [raw, setRaw] = useState("2 4 4 4 5 5 7 9");
  const vals = raw.split(/[\s;]+/).filter(Boolean).map(num);
  const ok = vals.length > 0 && vals.every(Number.isFinite);
  const s = ok ? M.stats(vals) : null;
  return (
    <>
      <p className="hint">Separe os números por espaço, ponto e vírgula ou quebra de linha. Use vírgula só para decimais.</p>
      <textarea className="area" value={raw} rows={3} onChange={(e) => setRaw(e.target.value)} aria-label="Dados" />
      {!s ? <Warn>Digite apenas números.</Warn> : (
        <Out>
          <Tex block tex={`n = ${s.n},\\quad \\text{soma} = ${tn(s.sum)},\\quad \\bar{x} = ${tn(s.mean)},\\quad \\text{mediana} = ${tn(s.median)}`} />
          <Tex block tex={`\\text{moda} = ${s.modes.length ? s.modes.map((m) => tn(m)).join(";\\, ") : "\\text{não há}"},\\quad \\text{mín} = ${tn(s.min)},\\quad \\text{máx} = ${tn(s.max)},\\quad \\text{amplitude} = ${tn(s.range)}`} />
          <Tex block tex={`\\sigma^2 = ${tn(s.varPop)},\\; \\sigma = ${tn(s.sdPop)}\\;\\text{(população)}`} />
          {s.n > 1 && <Tex block tex={`s^2 = ${tn(s.varSample)},\\; s = ${tn(s.sdSample)}\\;\\text{(amostra)}`} />}
        </Out>
      )}
      {s && <Ask prompt={`Para os dados ${vals.map((v) => fmt(v)).join(", ")}, explique como calcular média, mediana, moda e desvio padrão.`} />}
    </>
  );
}

export interface Topic { id: string; name: string; view: () => ReactNode }
export const TOPICS: Topic[] = [
  { id: "equacoes", name: "Equações", view: () => <Equations /> },
  { id: "fracoes", name: "Frações", view: () => <Fractions /> },
  { id: "potenciacao", name: "Potenciação", view: () => <Powers /> },
  { id: "radiciacao", name: "Radiciação", view: () => <Roots /> },
  { id: "porcentagem", name: "Porcentagem", view: () => <Percent /> },
  { id: "regra3", name: "Regra de três", view: () => <RuleThree /> },
  { id: "funcoes", name: "Funções", view: () => <Functions /> },
  { id: "sistemas", name: "Sistemas", view: () => <Systems /> },
  { id: "geometria", name: "Geometria", view: () => <GeoFormulas /> },
  { id: "trigonometria", name: "Trigonometria", view: () => <Trig /> },
  { id: "estatistica", name: "Estatística", view: () => <Stats /> },
  { id: "graficos", name: "Gráficos", view: () => <Plane functionsOnly /> },
];
