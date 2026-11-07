# Aethel A.M.I.

Assistente de inteligência artificial para Windows, com conversa, matemática, geometria, voz, histórico e memória.

## O que tem aqui

| Pasta | O que é |
|---|---|
| `app/` | O aplicativo (React + TypeScript + Vite, empacotado com Tauri 2) |
| `backend/` | Servidor Node.js + Express que fala com a IA (Groq). A chave da IA fica só aqui |
| `site/` | Site oficial de apresentação e download |
| `docs/` | Guias de instalação, publicação e configuração da API |
| `downloads/` | Pasta dos instaladores (os `.exe` não vão para o Git) |

## Rodar no seu computador (desenvolvimento)

1. Backend: `cd backend`, `npm install`, copie `.env.example` para `.env`, coloque sua chave (veja `docs/GUIA-DE-CONFIGURACAO-DA-API.md`) e rode `npm start`.
2. App: em outro terminal, `cd app`, `npm install` e `npm run dev`. Abra o endereço mostrado (normalmente `http://localhost:5173`).

## Segurança

- A chave da IA **nunca** vai para o GitHub, para o app ou para o site: só existe em `backend/.env` (no seu computador) e nas variáveis de ambiente do Render.
- O arquivo `.gitignore` já bloqueia `.env`, `node_modules`, builds e instaladores.

## Documentação

- `docs/GUIA-DE-INSTALACAO.md`
- `docs/GUIA-DE-PUBLICACAO.md`
- `docs/GUIA-DE-CONFIGURACAO-DA-API.md`

## Estado do projeto

Pronto: interface, temas, introdução animada, conversa com IA, histórico, memória, matemática, geometria, voz e site de apresentação.
Em andamento: publicação do backend, instalador `.exe` do Windows, página de Configurações completa.
