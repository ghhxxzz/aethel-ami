# Guia de publicação: GitHub e Render

Os comandos abaixo funcionam no **cmd** e no **PowerShell**, exceto onde indicado.

## Parte 1: GitHub

### 1. Preparar o Git (uma vez)

```
git --version
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Se `git` não for reconhecido, instale em git-scm.com e reabra o terminal.

### 2. Criar o repositório

Em **github.com/new**: nome `aethel-ami`. Pode ser **Private**: ele guarda só o código. **Não** marque "Add a README" nem ".gitignore" (o projeto já tem os dele). O instalador vai em **outro** repositório, público (Parte 3).

### 3. Enviar o projeto

```
cd /d D:\Projetos\Aethel-AMI
git init -b main
git add .
git status
```

Leia a lista do `git status`: **não pode aparecer** `.env`, `node_modules`, `dist` nem `.exe`. Só `.env.example` é permitido. Se estiver certo:

```
git commit -m "Primeira versão do Aethel A.M.I."
git remote add origin https://github.com/SEU-USUARIO/aethel-ami.git
git push -u origin main
```

O Git para Windows abre o navegador para você entrar na conta do GitHub. Senha comum não é aceita no terminal.

Confira que nenhuma chave foi junto (não deve achar nada):

```
git grep -nE "gsk_[A-Za-z0-9]{20,}"
```

### 4. Enviar versões futuras

```
cd /d D:\Projetos\Aethel-AMI
git add .
git status
git commit -m "Descreva o que mudou"
git push
```

## Parte 2: Render (backend)

1. Crie conta em **render.com** (pode entrar com o GitHub).
2. **New +** → **Web Service** → escolha o repositório do GitHub e autorize o Render a vê-lo.
3. Preencha:

| Campo | Valor |
|---|---|
| Name | `aethel-ami-backend` |
| Branch | `main` |
| Root Directory | `backend` |
| Runtime / Language | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` |

4. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `GROQ_API_KEY` | sua chave (só aqui) |
| `GROQ_MODEL` | o modelo que `npm run models` mostrou |
| `GROQ_STT_MODEL` | `whisper-large-v3-turbo` (ou o de voz da sua lista) |

Não precisa definir `PORT` (o Render define sozinho). Deixe `CORS_ORIGINS` sem definir para usar os padrões (app em desenvolvimento e app instalado).

5. Em **Advanced**, se houver o campo **Health Check Path**, coloque `/health`.
6. **Create Web Service** e espere o deploy terminar (acompanhe os logs).

Se o log mostrar uma versão de Node abaixo de 18, adicione a variável `NODE_VERSION` com `22`.

### 5. Testar

Troque `SEU-SERVICO` pelo endereço que o Render mostrar:

```
curl https://SEU-SERVICO.onrender.com/health
```

Deve responder `"status":"ok"` e `"keyConfigured":true`. Conversa de teste (cmd):

```
curl -N -X POST https://SEU-SERVICO.onrender.com/api/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"oi\"}]}"
```

### 6. Usar o backend publicado no app

Em desenvolvimento (cmd, **sem espaço antes do `&&`**):

```
cd /d D:\Projetos\Aethel-AMI\app
set VITE_API_URL=https://SEU-SERVICO.onrender.com&& npm run dev
```

No PowerShell:

```
cd D:\Projetos\Aethel-AMI\app
$env:VITE_API_URL="https://SEU-SERVICO.onrender.com"; npm run dev
```

Para o instalador, crie `app\.env.production` com a linha `VITE_API_URL=https://SEU-SERVICO.onrender.com` antes de compilar (o arquivo é ignorado pelo Git, de propósito).

### Atualizar o backend

Cada `git push` na branch `main` faz o Render publicar de novo, em geral sozinho.

## Plano gratuito do Render: o que esperar

- O serviço **dorme após 15 minutos sem uso**. A primeira mensagem depois disso pode levar cerca de 1 minuto. O app já faz um pedido leve ao abrir para acordá-lo.
- Há 750 horas gratuitas por mês.
- O Render pode reiniciar o serviço a qualquer momento. O backend não guarda dados (o histórico fica no app), então isso não perde nada.

## Parte 3: instalador (.exe) no GitHub Releases

O `.exe` **não vai pelo `git push`**: o Git comum bloqueia arquivos acima de 100 MiB e instaladores não devem ficar no histórico do código. O lugar certo é a aba **Releases** (cada arquivo pode ter até 2 GiB, sem limite de banda).

**Release de repositório privado não é pública.** Só quem tem acesso de leitura ao repositório vê as releases. Por isso o instalador fica em um repositório **público** separado, só para downloads:

1. Em **github.com/new**: nome `aethel-ami-downloads`, **Public**, e **marque** "Add a README file" (a Release precisa de pelo menos um commit).
2. Depois de gerar o instalador, renomeie para um nome fixo (sem espaços):

```
copy "caminho\do\instalador.exe" D:\Projetos\Aethel-AMI\downloads\Aethel-AMI-Setup.exe
```

3. No repositório `aethel-ami-downloads`: **Releases** → **Create a new release**. Em "Choose a tag" digite `v0.1.0` e crie. Dê um título. Arraste `Aethel-AMI-Setup.exe` para a área de anexos e clique em **Publish release**.
4. Para cada versão nova, repita com `v0.1.1`, `v0.2.0`, etc. O site pega sozinho a mais recente.

## Parte 4: site (Netlify)

O site já busca a versão mais recente nas Releases do repositório de downloads. Só falta dizer a ele qual é o repositório. Troque `SEU-USUARIO` pelo seu usuário do GitHub:

```
cd /d D:\Projetos\Aethel-AMI\site
powershell -NoProfile -Command "(Get-Content config.js) -replace 'SEU-USUARIO','SEU-USUARIO-REAL' | Set-Content config.js"
type config.js
```

Teste localmente (o botão só liga se existir uma release com `.exe`):

```
npx --yes serve -l 3000 .
```

Os passos de publicação no Netlify serão detalhados quando o instalador existir.

### Se o botão mostrar "Baixar (página de versões)"

A API do GitHub recusou o pedido naquele momento (há limite de pedidos sem login) ou estava fora. O botão leva para a página de versões do repositório, onde o download funciona normalmente.

## Aviso do Windows

Instaladores sem assinatura digital costumam disparar o aviso "aplicativo não reconhecido" do SmartScreen. O usuário clica em **Mais informações** e depois em **Executar assim mesmo**. O site já explica isso.
