export type ThemeId = "black-purple" | "tri-color" | "light";

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
  /** cores só para a prévia visual no cartão */
  preview: { bg: string; side: string; a: string; b: string; c: string; text: string };
}

export const THEMES: ThemeInfo[] = [
  {
    id: "black-purple",
    name: "Black & Purple",
    description: "Grafite profundo com violeta elétrico.",
    preview: { bg: "#08060e", side: "#0d0a16", a: "#9d4edd", b: "#c77dff", c: "#7b2cbf", text: "#2a2040" },
  },
  {
    id: "tri-color",
    name: "Purple, Green & Blue",
    description: "Roxo, verde e azul sobre fundo noturno.",
    preview: { bg: "#070b14", side: "#0b1020", a: "#8b5cf6", b: "#34d399", c: "#38bdf8", text: "#223058" },
  },
  {
    id: "light",
    name: "Light",
    description: "Claro e limpo, com acentos em azul, verde e roxo.",
    preview: { bg: "#f4f5fa", side: "#ffffff", a: "#6d4ae0", b: "#1f9d76", c: "#2563eb", text: "#d9dcee" },
  },
];
