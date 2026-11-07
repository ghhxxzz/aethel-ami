/** Contas de matemática puras (sem tela), para poderem ser testadas. */
export const num = (s: string): number => {
  const t = s.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
};

/** Formata no padrão brasileiro: vírgula decimal, sem separador de milhar. */
export function fmt(n: number, digits = 6): string {
  if (Number.isNaN(n)) return "indefinido";
  if (!Number.isFinite(n)) return n > 0 ? "∞" : "−∞";
  return Number(n.toPrecision(12)).toLocaleString("pt-BR", { maximumFractionDigits: digits, useGrouping: false });
}
/** Número pronto para LaTeX (vírgula decimal protegida). */
export const tn = (n: number, d = 6) => fmt(n, d).replace(",", "{,}").replace("−", "-");
/** Número entre parênteses se for negativo. */
export const pn = (n: number, d = 6) => (n < 0 ? `(${tn(n, d)})` : tn(n, d));

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

export function simplify(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

export function fractionOp(n1: number, d1: number, n2: number, d2: number, op: "+" | "-" | "*" | "/") {
  let n: number, d: number;
  if (op === "+") { n = n1 * d2 + n2 * d1; d = d1 * d2; }
  else if (op === "-") { n = n1 * d2 - n2 * d1; d = d1 * d2; }
  else if (op === "*") { n = n1 * n2; d = d1 * d2; }
  else { n = n1 * d2; d = d1 * n2; }
  return { raw: { n, d }, simple: d === 0 ? null : simplify(n, d) };
}

export type QuadResult =
  | { kind: "degenerate"; all: boolean }
  | { kind: "linear"; x: number }
  | { kind: "two"; delta: number; x1: number; x2: number }
  | { kind: "one"; delta: number; x: number }
  | { kind: "complex"; delta: number; re: number; im: number };

export function solveQuadratic(a: number, b: number, c: number): QuadResult {
  if (a === 0) {
    if (b === 0) return { kind: "degenerate", all: c === 0 };
    return { kind: "linear", x: -c / b };
  }
  const delta = b * b - 4 * a * c;
  if (delta > 0) {
    const r = Math.sqrt(delta);
    const x1 = (-b + r) / (2 * a), x2 = (-b - r) / (2 * a);
    return { kind: "two", delta, x1: Math.min(x1, x2), x2: Math.max(x1, x2) };
  }
  if (delta === 0) return { kind: "one", delta, x: -b / (2 * a) };
  return { kind: "complex", delta, re: -b / (2 * a), im: Math.sqrt(-delta) / (2 * Math.abs(a)) };
}

export function solveSystem(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number) {
  const D = a1 * b2 - a2 * b1;
  const Dx = c1 * b2 - c2 * b1;
  const Dy = a1 * c2 - a2 * c1;
  if (D !== 0) return { kind: "unique" as const, D, Dx, Dy, x: Dx / D, y: Dy / D };
  return { kind: Dx === 0 && Dy === 0 ? ("infinite" as const) : ("none" as const), D, Dx, Dy };
}

export function ruleOfThree(a: number, b: number, c: number, inverse: boolean): number {
  return inverse ? (a * b) / c : (b * c) / a;
}

/** Raiz de índice n; negativa só para índice ímpar. */
export function nthRoot(x: number, n: number): number {
  if (x < 0) return n % 2 === 1 ? -Math.pow(-x, 1 / n) : NaN;
  const r = Math.pow(x, 1 / n);
  const rr = Math.round(r);
  return Math.abs(Math.pow(rr, n) - x) < 1e-9 * Math.max(1, x) ? rr : r;
}

/** Simplifica um radical inteiro: ⁿ√m = k · ⁿ√r. */
export function simplifyRadical(m: number, n: number): { k: number; r: number } {
  let k = 1, r = m;
  for (let f = 2; Math.pow(f, n) <= r; f++) {
    const p = Math.pow(f, n);
    while (r % p === 0) { r /= p; k *= f; }
  }
  return { k, r };
}

export function stats(values: number[]) {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  const top = Math.max(...counts.values());
  const modes = top === 1 ? [] : [...counts.entries()].filter(([, c]) => c === top).map(([v]) => v).sort((a, b) => a - b);
  const ss = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  const varPop = ss / n;
  const varSample = n > 1 ? ss / (n - 1) : NaN;
  return {
    n, sum, mean, median, modes, min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0],
    varPop, sdPop: Math.sqrt(varPop), varSample, sdSample: Math.sqrt(varSample),
  };
}

export const toRad = (d: number) => (d * Math.PI) / 180;
export const toDeg = (r: number) => (r * 180) / Math.PI;

/** Triângulo retângulo a partir de dois lados (catetos a, b e hipotenusa c). */
export function rightTriangle(a: number, b: number, c: number) {
  const have = [a, b, c].map((v) => Number.isFinite(v) && v > 0);
  if (have.filter(Boolean).length !== 2) return { error: "Preencha exatamente dois lados." as const };
  if (!have[2]) c = Math.hypot(a, b);
  else if (!have[1]) { if (c <= a) return { error: "A hipotenusa precisa ser maior que o cateto." as const }; b = Math.sqrt(c * c - a * a); }
  else { if (c <= b) return { error: "A hipotenusa precisa ser maior que o cateto." as const }; a = Math.sqrt(c * c - b * b); }
  const A = toDeg(Math.asin(a / c));
  return { a, b, c, A, B: 90 - A, area: (a * b) / 2, perimeter: a + b + c };
}

export function percentOf(p: number, v: number) { return (p / 100) * v; }
export function whatPercent(part: number, whole: number) { return (part / whole) * 100; }
export function changeBy(v: number, p: number, up: boolean) { return up ? v * (1 + p / 100) : v * (1 - p / 100); }
