/**
 * Modelos de IA costumam escrever fórmulas como \[ ... \] e \( ... \).
 * O renderizador só entende $...$ e $$...$$, então convertemos antes (fora de blocos de código).
 */
export function normalizeMath(src: string): string {
  const parts = src.split(/(```[\s\S]*?```|`[^`\n]*`)/g);
  return parts
    .map((p, i) => {
      if (i % 2 === 1) return p; // trecho de código: não mexe
      return p
        .replace(/\\\[([\s\S]+?)\\\]/g, (_m, f: string) => `\n$$\n${f.trim()}\n$$\n`)
        .replace(/\\\(([\s\S]+?)\\\)/g, (_m, f: string) => `$${f.trim()}$`)
        // linha só com [ ... ] contendo comando LaTeX (ex.: \frac, \boxed): o modelo esqueceu a barra
        .replace(/^[ \t]*\[[ \t]*([^\n]*\\[a-zA-Z]+[^\n]*?)[ \t]*\][ \t]*$/gm, (_m, f: string) => `\n$$\n${f.trim()}\n$$\n`)
        // \boxed{67} vira só 67 (a moldura do KaTeX fica estranha no chat); fica por último de propósito
        .replace(/\\boxed\{([^{}]*)\}/g, "$1");
    })
    .join("");
}
