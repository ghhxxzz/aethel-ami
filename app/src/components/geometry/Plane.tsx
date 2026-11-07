import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import { compile } from "../../lib/expr";
import { fmt } from "../../lib/mathTools";
import { useAskAI } from "../../hooks/useAskAI";

interface Pt { id: string; label: string; x: number; y: number }
type Kind = "segmento" | "reta" | "circulo" | "triangulo" | "poligono" | "angulo";
interface Shape { id: string; kind: Kind; pts: string[] }
interface Fn { id: string; src: string; color: string }
type Tool = "mover" | "ponto" | Kind | "apagar";

const NEED: Partial<Record<Tool, number>> = { segmento: 2, reta: 2, circulo: 2, triangulo: 3, angulo: 3 };
const COLORS = ["#34d399", "#38bdf8", "#f59e0b", "#f472b6", "#a3e635"];
const TOOLS: { id: Tool; name: string; hint: string }[] = [
  { id: "mover", name: "Mover", hint: "Arraste pontos para mexer na figura. Arraste o fundo para deslocar o plano; use a roda do mouse para o zoom." },
  { id: "ponto", name: "Ponto", hint: "Clique no plano para criar um ponto." },
  { id: "segmento", name: "Segmento", hint: "Clique em dois pontos (ou em dois lugares do plano)." },
  { id: "reta", name: "Reta", hint: "Clique em dois pontos por onde a reta passa." },
  { id: "circulo", name: "Circunferência", hint: "Clique no centro e depois em um ponto da borda." },
  { id: "triangulo", name: "Triângulo", hint: "Clique nos três vértices." },
  { id: "poligono", name: "Polígono", hint: "Clique nos vértices e depois em Concluir polígono." },
  { id: "angulo", name: "Ângulo", hint: "Clique em A, depois no vértice B e depois em C: mede o ângulo ABC." },
  { id: "apagar", name: "Apagar", hint: "Clique em um ponto ou em uma figura para apagar." },
];

const labelFor = (n: number) => String.fromCharCode(65 + (n % 26)) + (n >= 26 ? String(Math.floor(n / 26)) : "");
const f2 = (n: number) => fmt(n, 2);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const area = (p: Pt[]) => Math.abs(p.reduce((s, a, i) => s + (a.x * p[(i + 1) % p.length].y - p[(i + 1) % p.length].x * a.y), 0)) / 2;
const perim = (p: Pt[]) => p.reduce((s, a, i) => s + dist(a, p[(i + 1) % p.length]), 0);
const angleAt = (a: Pt, b: Pt, c: Pt) => {
  const ux = a.x - b.x, uy = a.y - b.y, vx = c.x - b.x, vy = c.y - b.y;
  const m = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  return m === 0 ? NaN : (Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / m))) * 180) / Math.PI;
};
const sgn = (n: number) => (n < 0 ? "−" : "+");
function lineEq(a: Pt, b: Pt): string {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) < 1e-9) return `x = ${fmt(a.x, 3)}`;
  const m = dy / dx, k = a.y - m * a.x;
  const mm = Math.abs(m) < 1e-9 ? "" : Math.abs(m - 1) < 1e-9 ? "x" : Math.abs(m + 1) < 1e-9 ? "−x" : `${fmt(m, 3)}x`;
  if (!mm) return `y = ${fmt(k, 3)}`;
  return Math.abs(k) < 1e-9 ? `y = ${mm}` : `y = ${mm} ${sgn(k)} ${fmt(Math.abs(k), 3)}`;
}

function measures(shapes: Shape[], get: (id: string) => Pt | undefined) {
  return shapes.flatMap((s) => {
    const p = s.pts.map(get);
    if (p.some((x) => !x)) return [];
    const P = p as Pt[];
    const names = P.map((x) => x.label).join("");
    const L: string[] = [];
    let title = "";
    if (s.kind === "segmento") {
      title = `Segmento ${names}`;
      L.push(`Comprimento: ${f2(dist(P[0], P[1]))}`, `Ponto médio: (${f2((P[0].x + P[1].x) / 2)}; ${f2((P[0].y + P[1].y) / 2)})`, `Reta suporte: ${lineEq(P[0], P[1])}`);
    } else if (s.kind === "reta") {
      title = `Reta ${names}`;
      L.push(`Equação: ${lineEq(P[0], P[1])}`);
    } else if (s.kind === "circulo") {
      const r = dist(P[0], P[1]);
      title = `Circunferência (centro ${P[0].label}, passa por ${P[1].label})`;
      L.push(`Raio: ${f2(r)}`, `Diâmetro: ${f2(2 * r)}`, `Comprimento: ${f2(2 * Math.PI * r)}`, `Área: ${f2(Math.PI * r * r)}`,
        `Equação: (x ${sgn(-P[0].x)} ${fmt(Math.abs(P[0].x), 2)})² + (y ${sgn(-P[0].y)} ${fmt(Math.abs(P[0].y), 2)})² = ${fmt(r * r, 2)}`);
    } else if (s.kind === "triangulo") {
      const [a, b, c] = [dist(P[1], P[2]), dist(P[0], P[2]), dist(P[0], P[1])];
      const ar = area(P);
      title = `Triângulo ${names}`;
      L.push(`Lados: ${P[1].label}${P[2].label} = ${f2(a)}, ${P[0].label}${P[2].label} = ${f2(b)}, ${P[0].label}${P[1].label} = ${f2(c)}`, `Perímetro: ${f2(a + b + c)}`, `Área: ${f2(ar)}`);
      if (ar < 1e-9) L.push("Os três pontos estão alinhados (não formam triângulo).");
      else {
        const A = angleAt(P[1], P[0], P[2]), B = angleAt(P[0], P[1], P[2]), C = angleAt(P[0], P[2], P[1]);
        L.push(`Ângulos: ${P[0].label} = ${f2(A)}°, ${P[1].label} = ${f2(B)}°, ${P[2].label} = ${f2(C)}°`);
        const sd = [a, b, c].sort((x, y) => x - y);
        const eqs = (u: number, v: number) => Math.abs(u - v) < 1e-6 * Math.max(1, u, v);
        const bySide = eqs(sd[0], sd[2]) ? "equilátero" : eqs(sd[0], sd[1]) || eqs(sd[1], sd[2]) ? "isósceles" : "escaleno";
        const d = sd[2] ** 2 - (sd[0] ** 2 + sd[1] ** 2);
        const byAngle = Math.abs(d) < 1e-6 * sd[2] ** 2 ? "retângulo" : d > 0 ? "obtusângulo" : "acutângulo";
        L.push(`Classificação: ${bySide} e ${byAngle}`);
      }
    } else if (s.kind === "poligono") {
      title = `Polígono ${names} (${P.length} lados)`;
      L.push(`Perímetro: ${f2(perim(P))}`, `Área: ${f2(area(P))}`);
    } else {
      title = `Ângulo ${names}`;
      L.push(`Medida: ${f2(angleAt(P[0], P[1], P[2]))}°`);
    }
    return [{ id: s.id, title, lines: L }];
  });
}

export function Plane({ functionsOnly = false }: { functionsOnly?: boolean }) {
  const ask = useAskAI();
  const wrap = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 760, h: 480 });
  const [view, setView] = useState({ cx: 0, cy: 0, s: 40 });
  const [pts, setPts] = useState<Pt[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>(functionsOnly ? "mover" : "ponto");
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(true);
  const [fns, setFns] = useState<Fn[]>(functionsOnly ? [{ id: "f0", src: "x^2 - 2", color: COLORS[0] }] : []);
  const counter = useRef(0);
  const drag = useRef<{ kind: "pan"; x: number; y: number; cx: number; cy: number } | { kind: "pt"; id: string } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: Math.max(280, el.clientWidth), h: Math.max(320, Math.min(560, Math.round(el.clientWidth * 0.62))) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const sx = (x: number) => w / 2 + (x - view.cx) * view.s;
  const sy = (y: number) => h / 2 - (y - view.cy) * view.s;
  const world = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: view.cx + (e.clientX - r.left - w / 2) / view.s, y: view.cy - (e.clientY - r.top - h / 2) / view.s };
  };
  const snapV = (v: number) => (snap ? Math.round(v * 2) / 2 : Math.round(v * 1000) / 1000);
  const get = (id: string) => pts.find((p) => p.id === id);

  // Zoom com a roda do mouse (precisa de listener não passivo para não rolar a página).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setView((v) => {
        const s = Math.min(600, Math.max(4, v.s * factor));
        const mx = v.cx + (e.clientX - r.left - r.width / 2) / v.s, my = v.cy - (e.clientY - r.top - r.height / 2) / v.s;
        return { s, cx: mx - (e.clientX - r.left - r.width / 2) / s, cy: my + (e.clientY - r.top - r.height / 2) / s };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const addShape = (kind: Kind, ids: string[]) => setShapes((s) => [...s, { id: `s${Date.now()}${s.length}`, kind, pts: ids }]);
  const newPoint = (x: number, y: number): Pt => {
    const p: Pt = { id: `p${counter.current}`, label: labelFor(counter.current), x: snapV(x), y: snapV(y) };
    counter.current++;
    setPts((o) => [...o, p]);
    return p;
  };
  const pick = (id: string) => {
    if (tool === "ponto" || tool === "mover" || tool === "apagar" || pending.includes(id)) return;
    const next = [...pending, id];
    const need = NEED[tool];
    if (tool !== "poligono" && need && next.length === need) {
      addShape(tool as Kind, next);
      setPending([]);
    } else setPending(next);
  };
  const removePoint = (id: string) => {
    setPts((o) => o.filter((p) => p.id !== id));
    setShapes((o) => o.filter((s) => !s.pts.includes(id)));
    setPending((o) => o.filter((x) => x !== id));
  };
  const chooseTool = (t: Tool) => { setTool(t); setPending([]); };

  const bgDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (tool === "apagar") return;
    if (tool === "mover") {
      drag.current = { kind: "pan", x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
      svgRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    const q = world(e);
    const p = newPoint(q.x, q.y);
    pick(p.id);
  };
  const move = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") setView((v) => ({ ...v, cx: d.cx - (e.clientX - d.x) / v.s, cy: d.cy + (e.clientY - d.y) / v.s }));
    else {
      const q = world(e);
      setPts((o) => o.map((p) => (p.id === d.id ? { ...p, x: snapV(q.x), y: snapV(q.y) } : p)));
    }
  };
  const ptDown = (e: RPointerEvent<SVGElement>, id: string) => {
    e.stopPropagation();
    if (tool === "mover") { drag.current = { kind: "pt", id }; svgRef.current?.setPointerCapture(e.pointerId); }
    else if (tool === "apagar") removePoint(id);
    else pick(id);
  };

  // ---- grade ----
  const xmin = view.cx - w / 2 / view.s, xmax = view.cx + w / 2 / view.s;
  const ymin = view.cy - h / 2 / view.s, ymax = view.cy + h / 2 / view.s;
  const target = 70 / view.s, pow = 10 ** Math.floor(Math.log10(target)), m = target / pow;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * pow;
  const xs: number[] = [], ys: number[] = [];
  for (let v = Math.ceil(xmin / step) * step; v <= xmax; v += step) xs.push(Math.round(v / step) * step);
  for (let v = Math.ceil(ymin / step) * step; v <= ymax; v += step) ys.push(Math.round(v / step) * step);
  const axY = Math.min(Math.max(sy(0), 12), h - 6), axX = Math.min(Math.max(sx(0), 6), w - 28);

  // ---- funções ----
  const compiled = useMemo(
    () => fns.map((f) => { try { return { id: f.id, fn: compile(f.src), err: "" }; } catch (e) { return { id: f.id, fn: null, err: (e as Error).message }; } }),
    [fns],
  );
  const paths = compiled.map((c, i) => {
    if (!c.fn) return "";
    let d = "", pen = false, prev = 0;
    const N = Math.ceil(w / 2);
    for (let i2 = 0; i2 <= N; i2++) {
      const x = xmin + ((xmax - xmin) * i2) / N;
      const y = c.fn(x);
      const py = sy(y);
      if (!Number.isFinite(y) || Math.abs(py) > 1e5 || (pen && Math.abs(py - prev) > h * 2)) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${sx(x).toFixed(1)} ${py.toFixed(1)} `;
      pen = true; prev = py;
      void i;
    }
    return d;
  });

  const info = useMemo(() => measures(shapes, get), [shapes, pts]); // eslint-disable-line react-hooks/exhaustive-deps
  const describe = () => {
    const parts = pts.map((p) => `${p.label}(${f2(p.x)}; ${f2(p.y)})`).join(", ");
    const fig = info.map((i) => `${i.title}: ${i.lines.join("; ")}`).join("\n");
    const fn = fns.filter((f) => f.src.trim()).map((f) => `f(x) = ${f.src}`).join("; ");
    return `Tenho esta construção no plano cartesiano.\nPontos: ${parts || "nenhum"}\n${fig}${fn ? `\nFunções: ${fn}` : ""}\nExplique as propriedades geométricas e confira as medidas.`;
  };

  const shapeEls = shapes.map((s) => {
    const P = s.pts.map(get);
    if (P.some((p) => !p)) return null;
    const Q = P as Pt[];
    const pathHit = (d: string) => <path d={d} className="hit" onPointerDown={(e) => { if (tool === "apagar") { e.stopPropagation(); setShapes((o) => o.filter((x) => x.id !== s.id)); } }} />;
    if (s.kind === "segmento") { const d = `M${sx(Q[0].x)} ${sy(Q[0].y)}L${sx(Q[1].x)} ${sy(Q[1].y)}`; return <g key={s.id}><path d={d} className="shape" />{pathHit(d)}</g>; }
    if (s.kind === "reta") {
      const dx = Q[1].x - Q[0].x, dy = Q[1].y - Q[0].y, len = Math.hypot(dx, dy) || 1, Lg = (w + h) / view.s * 2;
      const d = `M${sx(Q[0].x - (dx / len) * Lg)} ${sy(Q[0].y - (dy / len) * Lg)}L${sx(Q[0].x + (dx / len) * Lg)} ${sy(Q[0].y + (dy / len) * Lg)}`;
      return <g key={s.id}><path d={d} className="shape" />{pathHit(d)}</g>;
    }
    if (s.kind === "circulo") {
      const r = dist(Q[0], Q[1]) * view.s;
      return (
        <g key={s.id}>
          <circle cx={sx(Q[0].x)} cy={sy(Q[0].y)} r={r} className="shape fill" />
          <circle cx={sx(Q[0].x)} cy={sy(Q[0].y)} r={r} className="hit" onPointerDown={(e) => { if (tool === "apagar") { e.stopPropagation(); setShapes((o) => o.filter((x) => x.id !== s.id)); } }} />
        </g>
      );
    }
    if (s.kind === "angulo") {
      const B = Q[1], r = 30;
      const a = { x: sx(Q[0].x) - sx(B.x), y: sy(Q[0].y) - sy(B.y) }, c = { x: sx(Q[2].x) - sx(B.x), y: sy(Q[2].y) - sy(B.y) };
      const la = Math.hypot(a.x, a.y) || 1, lc = Math.hypot(c.x, c.y) || 1;
      const p1 = { x: sx(B.x) + (a.x / la) * r, y: sy(B.y) + (a.y / la) * r }, p2 = { x: sx(B.x) + (c.x / lc) * r, y: sy(B.y) + (c.y / lc) * r };
      const sweep = a.x * c.y - a.y * c.x > 0 ? 1 : 0;
      const mx = a.x / la + c.x / lc, my = a.y / la + c.y / lc, ml = Math.hypot(mx, my) || 1;
      const d = `M${sx(B.x)} ${sy(B.y)}L${p1.x} ${p1.y}A${r} ${r} 0 0 ${sweep} ${p2.x} ${p2.y}Z`;
      return (
        <g key={s.id}>
          <path d={d} className="shape fill ang" />
          <text x={sx(B.x) + (mx / ml) * (r + 16)} y={sy(B.y) + (my / ml) * (r + 16)} className="lbl">{f2(angleAt(Q[0], Q[1], Q[2]))}°</text>
          {pathHit(d)}
        </g>
      );
    }
    const d = Q.map((p, i) => `${i ? "L" : "M"}${sx(p.x)} ${sy(p.y)}`).join("") + "Z";
    const cxp = Q.reduce((t, p) => t + sx(p.x), 0) / Q.length, cyp = Q.reduce((t, p) => t + sy(p.y), 0) / Q.length;
    return (
      <g key={s.id}>
        <path d={d} className="shape fill" />
        {s.kind === "triangulo" && area(Q) > 1e-9 && Q.map((p, i) => {
          const vx = cxp - sx(p.x), vy = cyp - sy(p.y), l = Math.hypot(vx, vy) || 1;
          return <text key={i} x={sx(p.x) + (vx / l) * 30} y={sy(p.y) + (vy / l) * 30} className="lbl">{f2(angleAt(Q[(i + 1) % 3], p, Q[(i + 2) % 3]))}°</text>;
        })}
        {pathHit(d)}
      </g>
    );
  });

  const hint = TOOLS.find((t) => t.id === tool)?.hint ?? "";
  return (
    <div className={`plane${functionsOnly ? " only-fn" : ""}`}>
      <div className="plane-canvas" ref={wrap}>
        <svg
          ref={svgRef} width={w} height={h} className={`plane-svg tool-${tool}`} role="img" aria-label="Plano cartesiano interativo"
          onPointerDown={bgDown} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
        >
          {grid && xs.map((v) => <line key={`gx${v}`} x1={sx(v)} x2={sx(v)} y1={0} y2={h} className="grid" />)}
          {grid && ys.map((v) => <line key={`gy${v}`} x1={0} x2={w} y1={sy(v)} y2={sy(v)} className="grid" />)}
          <line x1={0} x2={w} y1={sy(0)} y2={sy(0)} className="axis" />
          <line x1={sx(0)} x2={sx(0)} y1={0} y2={h} className="axis" />
          {xs.filter((v) => Math.abs(v) > step / 2).map((v) => <text key={`tx${v}`} x={sx(v)} y={axY + 14} className="tick mid">{fmt(v, 4)}</text>)}
          {ys.filter((v) => Math.abs(v) > step / 2).map((v) => <text key={`ty${v}`} x={axX + 5} y={sy(v) + 4} className="tick">{fmt(v, 4)}</text>)}
          {paths.map((d, i) => d && <path key={fns[i].id} d={d} fill="none" stroke={fns[i].color} strokeWidth={2.2} />)}
          {shapeEls}
          {pts.map((p) => (
            <g key={p.id} onPointerDown={(e) => ptDown(e, p.id)} className={`pt${pending.includes(p.id) ? " sel" : ""}`}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={14} className="pt-hit" />
              <circle cx={sx(p.x)} cy={sy(p.y)} r={5} className="pt-dot" />
              <text x={sx(p.x) + 9} y={sy(p.y) - 9} className="pt-lbl">{p.label}</text>
            </g>
          ))}
        </svg>
        <div className="zoom">
          <button aria-label="Aproximar" onClick={() => setView((v) => ({ ...v, s: Math.min(600, v.s * 1.3) }))}>+</button>
          <button aria-label="Afastar" onClick={() => setView((v) => ({ ...v, s: Math.max(4, v.s / 1.3) }))}>−</button>
          <button aria-label="Centralizar" title="Voltar para a origem" onClick={() => setView({ cx: 0, cy: 0, s: 40 })}>⌂</button>
        </div>
      </div>

      <div className="plane-panel">
        {!functionsOnly && (
          <>
            <div className="tools" role="group" aria-label="Ferramentas">
              {TOOLS.map((t) => <button key={t.id} className="tool-btn" aria-pressed={tool === t.id} onClick={() => chooseTool(t.id)}>{t.name}</button>)}
            </div>
            <p className="hint">{hint}{pending.length > 0 && ` (${pending.length} selecionado${pending.length > 1 ? "s" : ""})`}</p>
            {tool === "poligono" && pending.length >= 3 && (
              <button className="opt-btn" onClick={() => { addShape("poligono", pending); setPending([]); }}>Concluir polígono</button>
            )}
          </>
        )}
        <div className="toggles">
          {!functionsOnly && <label><input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Prender na grade (0,5)</label>}
          <label><input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} /> Mostrar grade</label>
        </div>

        <h3>Funções</h3>
        {fns.map((f, i) => (
          <div key={f.id} className="fn-row">
            <span className="dot" style={{ background: f.color }} />
            <span>f<sub>{i + 1}</sub>(x) =</span>
            <input value={f.src} aria-label={`Função ${i + 1}`} onChange={(e) => setFns((o) => o.map((x) => (x.id === f.id ? { ...x, src: e.target.value } : x)))} />
            <button aria-label="Remover função" onClick={() => setFns((o) => o.filter((x) => x.id !== f.id))}>✕</button>
            {compiled[i]?.err && <small className="err-line">{compiled[i].err}</small>}
          </div>
        ))}
        {fns.length < 5 && (
          <button className="opt-btn" onClick={() => setFns((o) => [...o, { id: `f${Date.now()}`, src: "", color: COLORS[o.length % COLORS.length] }])}>+ Adicionar função</button>
        )}
        <small className="hint">Use x, + − * / ^, sin(x), sqrt(x)… Ângulos em radianos.</small>

        {!functionsOnly && (
          <>
            <h3>Medidas</h3>
            {pts.length === 0 && <p className="hint">Nenhum ponto ainda.</p>}
            {pts.length > 0 && <p className="measure-pts">{pts.map((p) => `${p.label}(${f2(p.x)}; ${f2(p.y)})`).join("  ")}</p>}
            {info.map((i) => (
              <div key={i.id} className="measure"><b>{i.title}</b><ul>{i.lines.map((l) => <li key={l}>{l}</li>)}</ul></div>
            ))}
            <div className="panel-actions">
              <button className="opt-btn" disabled={pts.length === 0} onClick={() => ask(describe())}>Perguntar à IA sobre isto</button>
              <button className="opt-btn" disabled={pts.length === 0} onClick={() => { setPts([]); setShapes([]); setPending([]); counter.current = 0; }}>Limpar tudo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
