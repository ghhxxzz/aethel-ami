import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/** Mostra uma fórmula em LaTeX com KaTeX. */
export function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: block, throwOnError: false, output: "htmlAndMathml" });
    } catch {
      return "";
    }
  }, [tex, block]);
  return <span className={block ? "tex-block" : "tex"} dangerouslySetInnerHTML={{ __html: html }} />;
}
