/** Interpretador seguro de expressões como "2x^2 - 3*sin(x)". Não usa eval. Ângulos em radianos. */
const FUNCS: Record<string, (a: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: Math.log10, log2: Math.log2,
  exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
};
const FN_NAMES = Object.keys(FUNCS).sort((a, b) => b.length - a.length);

type Tok =
  | { k: "num"; v: number }
  | { k: "var" }
  | { k: "fn"; v: string }
  | { k: "op"; v: string }
  | { k: "lp" }
  | { k: "rp" };

function tokenize(src: string): Tok[] {
  const s = src
    .toLowerCase().replace(/\s+/g, "").replace(/,/g, ".").replace(/[×·]/g, "*").replace(/÷/g, "/")
    .replace(/[−–]/g, "-").replace(/π/g, "pi").replace(/²/g, "^2").replace(/³/g, "^3").replace(/√/g, "sqrt");
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const num = /^(\d+\.?\d*|\.\d+)/.exec(rest);
    if (num) { out.push({ k: "num", v: Number(num[1]) }); i += num[1].length; continue; }
    const c = s[i];
    if ("+-*/^".includes(c)) { out.push({ k: "op", v: c }); i++; continue; }
    if (c === "(") { out.push({ k: "lp" }); i++; continue; }
    if (c === ")") { out.push({ k: "rp" }); i++; continue; }
    const fn = FN_NAMES.find((n) => rest.startsWith(n));
    if (fn) { out.push({ k: "fn", v: fn }); i += fn.length; continue; }
    if (rest.startsWith("pi")) { out.push({ k: "num", v: Math.PI }); i += 2; continue; }
    if (c === "e") { out.push({ k: "num", v: Math.E }); i++; continue; }
    if (c === "x") { out.push({ k: "var" }); i++; continue; }
    throw new Error(`Não entendi "${c}" na expressão.`);
  }
  return out;
}

const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
const RIGHT = new Set(["^", "neg"]);

/** Transforma o texto em uma função de x. Lança Error com mensagem em português se estiver inválido. */
export function compile(src: string): (x: number) => number {
  if (!src.trim()) throw new Error("Escreva uma expressão.");
  const toks = tokenize(src);
  const out: Tok[] = [];
  const stack: Tok[] = [];
  let prevValue = false;

  const pushOp = (op: string) => {
    while (stack.length) {
      const t = stack[stack.length - 1];
      if (t.k !== "op") break;
      const p = PREC[t.v];
      if (p > PREC[op] || (p === PREC[op] && !RIGHT.has(op))) out.push(stack.pop() as Tok);
      else break;
    }
    stack.push({ k: "op", v: op });
  };

  toks.forEach((t, idx) => {
    if (t.k === "num" || t.k === "var") {
      if (prevValue) pushOp("*");
      out.push(t);
      prevValue = true;
    } else if (t.k === "fn") {
      if (toks[idx + 1]?.k !== "lp") throw new Error(`A função ${t.v} precisa de parênteses, por exemplo ${t.v}(x).`);
      if (prevValue) pushOp("*");
      stack.push(t);
      prevValue = false;
    } else if (t.k === "lp") {
      if (prevValue) pushOp("*");
      stack.push(t);
      prevValue = false;
    } else if (t.k === "rp") {
      while (stack.length && stack[stack.length - 1].k !== "lp") out.push(stack.pop() as Tok);
      if (!stack.length) throw new Error("Parêntese ) sem o ( correspondente.");
      stack.pop();
      if (stack.length && stack[stack.length - 1].k === "fn") out.push(stack.pop() as Tok);
      prevValue = true;
    } else {
      if (!prevValue && (t.v === "-" || t.v === "+")) {
        if (t.v === "-") stack.push({ k: "op", v: "neg" });
      } else {
        if (!prevValue) throw new Error(`Falta um número antes de "${t.v}".`);
        pushOp(t.v);
        prevValue = false;
      }
    }
  });
  while (stack.length) {
    const t = stack.pop() as Tok;
    if (t.k === "lp") throw new Error("Parêntese ( sem o ) correspondente.");
    out.push(t);
  }
  if (!prevValue) throw new Error("A expressão termina de forma incompleta.");

  return (x: number) => {
    const st: number[] = [];
    for (const t of out) {
      if (t.k === "num") st.push(t.v);
      else if (t.k === "var") st.push(x);
      else if (t.k === "fn") st.push(FUNCS[t.v](st.pop() as number));
      else if (t.k === "op") {
        if (t.v === "neg") st.push(-(st.pop() as number));
        else {
          const b = st.pop() as number;
          const a = st.pop() as number;
          st.push(t.v === "+" ? a + b : t.v === "-" ? a - b : t.v === "*" ? a * b : t.v === "/" ? a / b : Math.pow(a, b));
        }
      }
    }
    if (st.length !== 1) throw new Error("Expressão inválida.");
    return st[0];
  };
}
