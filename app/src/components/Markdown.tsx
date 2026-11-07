import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeMath } from "../lib/mathText";
import "katex/dist/katex.min.css";

/** Renderiza Markdown (listas, tabelas, código) e fórmulas em LaTeX com KaTeX. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {normalizeMath(text)}
      </ReactMarkdown>
    </div>
  );
}
